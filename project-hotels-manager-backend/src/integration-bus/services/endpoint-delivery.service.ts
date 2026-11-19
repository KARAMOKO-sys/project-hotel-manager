import { Inject, Injectable, Logger } from '@nestjs/common';
import { promises as dnsPromises } from 'dns';
import {
  ESB_HEADERS,
  ESB_USER_AGENT,
  MAX_ERROR_LENGTH,
  MESSAGE_BROKER_ADAPTER,
  allowPrivateUrls,
  isProductionEnv,
} from '../integration-bus.constants';
import { DeliveryResult, OutboundEnvelope } from '../integration-bus.types';
import type { MessageBrokerAdapter } from '../brokers/message-broker.adapter';
import { IntegrationEndpointKind } from '../schemas/integration-endpoint.entity';
import { signV1 } from '../utils/signature';
import {
  LookupAll,
  checkResolvedHost,
  checkUrlStatic,
} from '../utils/ssrf-guard';
import { SecretCipherService } from './secret-cipher.service';

/** Données d'un point de terminaison nécessaires à une livraison. */
export interface DeliveryTarget {
  _id?: unknown;
  kind: IntegrationEndpointKind;
  url?: string;
  broker_destination?: string;
  secret_encrypted?: string;
  headers?: Record<string, string>;
  timeout_ms?: number;
}

export interface DeliveryRequest {
  /** Identifiant de livraison (`X-PleasantStay-Delivery`). */
  deliveryId: string;
  /** Nom de l'événement (en-tête et clé de routage par défaut). */
  eventName: string;
  /** Clé de routage courtier (sujet d'automatisation), sinon `eventName`. */
  routingKey?: string;
  envelope: OutboundEnvelope;
}

type FetchLike = typeof fetch;

/**
 * Transport des messages de l'ESB : POST HTTP signé (webhook) ou
 * publication via l'adaptateur de courtier. Ne lève jamais d'exception :
 * renvoie un `DeliveryResult`.
 */
@Injectable()
export class EndpointDeliveryService {
  private readonly logger = new Logger(EndpointDeliveryService.name);

  /** Remplaçables dans les tests. */
  fetchImpl: FetchLike = (input: string | URL | Request, init?: RequestInit) =>
    fetch(input, init);
  lookupImpl: LookupAll = (host, options) => dnsPromises.lookup(host, options);
  now: () => number = () => Date.now();

  constructor(
    private readonly cipher: SecretCipherService,
    @Inject(MESSAGE_BROKER_ADAPTER)
    private readonly broker: MessageBrokerAdapter,
  ) {}

  async deliver(
    target: DeliveryTarget,
    request: DeliveryRequest,
  ): Promise<DeliveryResult> {
    const started = this.now();
    try {
      if (target.kind === IntegrationEndpointKind.BROKER) {
        await this.broker.publish(
          request.routingKey || request.eventName,
          request.envelope,
          {
            messageId: request.deliveryId,
            destination: target.broker_destination,
          },
        );
        return { ok: true, latency_ms: this.now() - started };
      }
      return await this.deliverWebhook(target, request, started);
    } catch (error) {
      return {
        ok: false,
        error: truncate(errorMessage(error)),
        latency_ms: this.now() - started,
      };
    }
  }

  private async deliverWebhook(
    target: DeliveryTarget,
    request: DeliveryRequest,
    started: number,
  ): Promise<DeliveryResult> {
    const guard = {
      isProduction: isProductionEnv(),
      allowPrivate: allowPrivateUrls(),
    };
    const elapsed = () => this.now() - started;
    if (!target.url) {
      return {
        ok: false,
        permanent: true,
        error: 'URL manquante',
        latency_ms: elapsed(),
      };
    }
    const staticCheck = checkUrlStatic(target.url, guard);
    if (!staticCheck.ok) {
      return {
        ok: false,
        permanent: true,
        error: staticCheck.reason,
        latency_ms: elapsed(),
      };
    }
    const dnsCheck = await checkResolvedHost(
      staticCheck.url,
      this.lookupImpl,
      guard,
    );
    if (!dnsCheck.ok) {
      return { ok: false, error: dnsCheck.reason, latency_ms: elapsed() };
    }

    let secret: string | undefined;
    if (target.secret_encrypted) {
      try {
        secret = this.cipher.decrypt(target.secret_encrypted);
      } catch {
        return {
          ok: false,
          permanent: true,
          error:
            'Secret de signature indéchiffrable (clé de chiffrement modifiée ?)',
          latency_ms: elapsed(),
        };
      }
    }

    const body = JSON.stringify(request.envelope);
    const timestamp = Math.floor(this.now() / 1000);
    const headers: Record<string, string> = {
      ...(target.headers ?? {}),
      'Content-Type': 'application/json',
      'User-Agent': ESB_USER_AGENT,
      [ESB_HEADERS.EVENT]: request.eventName,
      [ESB_HEADERS.DELIVERY]: request.deliveryId,
      [ESB_HEADERS.TIMESTAMP]: String(timestamp),
    };
    if (secret)
      headers[ESB_HEADERS.SIGNATURE] = signV1(secret, timestamp, body);

    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      target.timeout_ms ?? 10_000,
    );
    try {
      const response = await this.fetchImpl(staticCheck.url.toString(), {
        method: 'POST',
        headers,
        body,
        signal: controller.signal,
        // Pas de redirection automatique : elle contournerait le contrôle SSRF.
        redirect: 'manual',
      });
      const status = response.status;
      if (status >= 200 && status < 300) {
        await discardBody(response);
        return { ok: true, status_code: status, latency_ms: elapsed() };
      }
      const text = await readCapped(response, 500);
      if (status === 410) {
        return {
          ok: false,
          gone: true,
          status_code: status,
          error: truncate(
            `HTTP 410 Gone — point de terminaison désactivé ${text}`.trim(),
          ),
          latency_ms: elapsed(),
        };
      }
      const redirect =
        status >= 300 && status < 400 ? ' (redirections refusées)' : '';
      return {
        ok: false,
        status_code: status,
        error: truncate(`HTTP ${status}${redirect} ${text}`.trim()),
        latency_ms: elapsed(),
      };
    } catch (error) {
      const aborted = controller.signal.aborted;
      return {
        ok: false,
        error: aborted
          ? `Délai dépassé (${target.timeout_ms ?? 10_000} ms)`
          : truncate(errorMessage(error)),
        latency_ms: elapsed(),
      };
    } finally {
      clearTimeout(timer);
    }
  }
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    const cause = (error as Error & { cause?: unknown }).cause;
    return cause instanceof Error
      ? `${error.message}: ${cause.message}`
      : error.message;
  }
  return String(error);
}

function truncate(text: string): string {
  return text.length > MAX_ERROR_LENGTH
    ? `${text.slice(0, MAX_ERROR_LENGTH - 1)}…`
    : text;
}

async function discardBody(response: Response): Promise<void> {
  try {
    await response.body?.cancel();
  } catch {
    /* ignoré */
  }
}

/** Lit au plus `max` caractères de la réponse (évite de charger un corps énorme). */
async function readCapped(response: Response, max: number): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return '';
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (size < max) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      chunks.push(value);
      size += value.length;
    }
  } catch {
    /* ignoré */
  } finally {
    reader.cancel().catch(() => undefined);
  }
  return Buffer.concat(chunks).toString('utf8').slice(0, max);
}
