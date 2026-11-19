import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { isIP } from 'net';
import { AppsService } from '../../platform/apps/apps.service';
import { refId } from '../../platform/events/domain-event.publisher';
import { WebhookLogService } from '../../webhook-log/services/webhook-log.service';
import { CreateWebhookLogDto } from '../../webhook-log/dto/create-webhook-log.dto';
import {
  ESB_HEADERS,
  INTEGRATION_BUS_APP_KEY,
  INTEGRATION_INBOUND_CHANNEL,
} from '../integration-bus.constants';
import { InboundIntegrationEvent } from '../integration-bus.types';
import { InboundSignatureScheme } from '../schemas/integration-inbound-source.entity';
import { SignatureCheck, verifyHexHeader, verifyV1 } from '../utils/signature';
import {
  InboundSourceService,
  InboundSourceWithSecret,
} from './inbound-source.service';
import { SecretCipherService } from './secret-cipher.service';

/** Vue minimale de la requête HTTP nécessaire à la vérification. */
export interface InboundRequest {
  rawBody?: Buffer;
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
}

export interface InboundAck {
  received: true;
  duplicate: boolean;
  webhook_log_id?: string;
}

/** En-têtes jamais journalisés. */
const SENSITIVE_HEADERS = new Set([
  'authorization',
  'cookie',
  'proxy-authorization',
  'x-api-key',
]);
const DEFAULT_EVENT_ID_PATHS = [
  'id',
  'event_id',
  'eventId',
  'transaction_id',
  'cpm_trans_id',
];
const DEFAULT_EVENT_TYPE_PATHS = ['type', 'event', 'event_type', 'eventType'];

/**
 * Réception sécurisée des webhooks entrants : vérification HMAC en temps
 * constant sur le corps BRUT, anti-rejeu par horodatage, déduplication par
 * identifiant fournisseur, journalisation dans `webhook_logs`
 * (signature_verified = true) puis publication sur `integration.inbound`.
 */
@Injectable()
export class InboundWebhookService {
  private readonly logger = new Logger(InboundWebhookService.name);
  nowSeconds: () => number = () => Math.floor(Date.now() / 1000);

  constructor(
    private readonly sources: InboundSourceService,
    private readonly cipher: SecretCipherService,
    private readonly webhookLogs: WebhookLogService,
    private readonly apps: AppsService,
    private readonly emitter: EventEmitter2,
  ) {}

  async receive(key: string, request: InboundRequest): Promise<InboundAck> {
    const source = await this.sources.findActiveByKey(key);
    // Même réponse pour clé inconnue, source inactive ou application absente.
    if (
      !source ||
      !(await this.isAppInstalled(String(source.organization_id)))
    ) {
      throw new NotFoundException('Point de réception introuvable');
    }
    if (!Buffer.isBuffer(request.rawBody)) {
      // Fail closed : sans corps brut, la signature n'est pas vérifiable.
      throw new BadRequestException(
        'Corps brut indisponible : impossible de vérifier la signature',
      );
    }

    const check = this.verify(source, request);
    if (!check.valid) {
      await this.sources
        .recordReception(source._id, false)
        .catch(() => undefined);
      this.logger.warn(
        `Webhook entrant rejeté (source ${String(source._id)}) : ${check.reason}`,
      );
      throw new UnauthorizedException(`Signature invalide (${check.reason})`);
    }

    const payload = this.parsePayload(request);
    const eventId = pickString(
      payload,
      source.event_id_path ? [source.event_id_path] : DEFAULT_EVENT_ID_PATHS,
    );
    const eventType =
      header(request.headers, ESB_HEADERS.EVENT) ??
      pickString(
        payload,
        source.event_type_path
          ? [source.event_type_path]
          : DEFAULT_EVENT_TYPE_PATHS,
      ) ??
      'unknown';

    const dto: CreateWebhookLogDto = {
      provider: source.provider,
      event_type: eventType.slice(0, 150),
      event_id: eventId?.slice(0, 255),
      property_id: source.property_id ? String(source.property_id) : undefined,
      payload,
      headers: sanitizeHeaders(request.headers),
      signature: this.signatureHeader(source, request)?.slice(0, 2000),
      signature_verified: true,
      ip_address: request.ip && isIP(request.ip) ? request.ip : undefined,
      notes:
        `Source d'intégration « ${source.name} » (${String(source._id)})`.slice(
          0,
          500,
        ),
    };
    const log = (await this.webhookLogs.create(dto)) as unknown as {
      _id?: unknown;
      is_duplicate?: boolean;
    };
    await this.sources.recordReception(source._id, true).catch(() => undefined);
    const duplicate = !!log.is_duplicate;
    const logId = refId(log._id);

    if (!duplicate) {
      const event: InboundIntegrationEvent = {
        source: {
          id: String(source._id),
          name: source.name,
          organization_id: String(source.organization_id),
          property_id: source.property_id
            ? String(source.property_id)
            : undefined,
        },
        provider: source.provider,
        event_type: eventType,
        event_id: eventId,
        webhook_log_id: logId,
        payload,
      };
      // Publication différée : la réponse 202 part sans attendre les abonnés.
      setImmediate(() => {
        this.emitter
          .emitAsync(INTEGRATION_INBOUND_CHANNEL, event)
          .catch((error: unknown) =>
            this.logger.error(
              `Abonné ${INTEGRATION_INBOUND_CHANNEL} en erreur : ${
                error instanceof Error ? error.message : String(error)
              }`,
            ),
          );
      });
    }
    return { received: true, duplicate, webhook_log_id: logId };
  }

  private verify(
    source: InboundSourceWithSecret,
    request: InboundRequest,
  ): SignatureCheck {
    if (!source.secret_encrypted)
      return { valid: false, reason: 'missing_signature' };
    let secret: string;
    try {
      secret = this.cipher.decrypt(source.secret_encrypted);
    } catch {
      this.logger.error(
        `Secret indéchiffrable pour la source ${String(source._id)}`,
      );
      return { valid: false, reason: 'invalid_signature' };
    }
    const body = request.rawBody!;
    if (
      source.signature_scheme === InboundSignatureScheme.HMAC_SHA256_HEX_HEADER
    ) {
      return verifyHexHeader({
        secret,
        body,
        signatureHeader: this.signatureHeader(source, request),
        prefix: source.signature_prefix,
      });
    }
    return verifyV1({
      secret,
      body,
      timestampHeader: header(request.headers, ESB_HEADERS.TIMESTAMP),
      signatureHeader: header(request.headers, ESB_HEADERS.SIGNATURE),
      toleranceSeconds: source.tolerance_seconds ?? 300,
      nowSeconds: this.nowSeconds(),
    });
  }

  private signatureHeader(
    source: InboundSourceWithSecret,
    request: InboundRequest,
  ) {
    return source.signature_scheme ===
      InboundSignatureScheme.HMAC_SHA256_HEX_HEADER
      ? header(request.headers, source.signature_header ?? 'x-signature')
      : header(request.headers, ESB_HEADERS.SIGNATURE);
  }

  private parsePayload(request: InboundRequest): Record<string, unknown> {
    if (
      request.body &&
      typeof request.body === 'object' &&
      !Array.isArray(request.body)
    ) {
      return request.body as Record<string, unknown>;
    }
    const text = request.rawBody!.toString('utf8');
    try {
      const parsed: unknown = JSON.parse(text);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      return { data: parsed };
    } catch {
      return { raw: text.slice(0, 100_000) };
    }
  }

  private async isAppInstalled(organizationId: string): Promise<boolean> {
    try {
      return await this.apps.isInstalled(
        organizationId,
        INTEGRATION_BUS_APP_KEY,
      );
    } catch {
      return false;
    }
  }
}

function header(
  headers: InboundRequest['headers'],
  name: string,
): string | undefined {
  const value = headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

function sanitizeHeaders(
  headers: InboundRequest['headers'],
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [name, value] of Object.entries(headers)) {
    if (value === undefined || SENSITIVE_HEADERS.has(name.toLowerCase()))
      continue;
    result[name] = (Array.isArray(value) ? value.join(', ') : value).slice(
      0,
      1000,
    );
  }
  return result;
}

/** Première valeur scalaire trouvée parmi des chemins en notation pointée. */
export function pickString(
  payload: Record<string, unknown>,
  paths: string[],
): string | undefined {
  for (const path of paths) {
    let current: unknown = payload;
    for (const part of path.split('.')) {
      if (!current || typeof current !== 'object') {
        current = undefined;
        break;
      }
      current = (current as Record<string, unknown>)[part];
    }
    if (typeof current === 'string' && current) return current;
    if (typeof current === 'number') return String(current);
  }
  return undefined;
}
