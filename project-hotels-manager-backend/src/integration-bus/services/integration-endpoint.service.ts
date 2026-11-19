import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types } from 'mongoose';
import { randomUUID } from 'crypto';
import { TenantScopeService } from '../../platform/tenancy/tenant-scope.service';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import {
  DEFAULT_AUTO_DISABLE_AFTER,
  PING_EVENT_NAME,
  allowPrivateUrls,
  isProductionEnv,
  positiveIntFromEnv,
} from '../integration-bus.constants';
import {
  IntegrationEndpoint,
  IntegrationEndpointKind,
} from '../schemas/integration-endpoint.entity';
import {
  CreateIntegrationEndpointDto,
  IntegrationEndpointQueryDto,
  UpdateIntegrationEndpointDto,
} from '../dto/integration-endpoint.dto';
import { validateCustomHeaders } from '../utils/custom-headers';
import { checkUrlStatic } from '../utils/ssrf-guard';
import { DeliveryResult, OutboundEnvelope } from '../integration-bus.types';
import {
  SecretCipherService,
  generateSigningSecret,
  secretHint,
} from './secret-cipher.service';
import { EndpointDeliveryService } from './endpoint-delivery.service';
import { resolveOrganization, toObjectId } from './integration-scope.helper';

/** Vue API d'un point de terminaison (sans secret). */
export type IntegrationEndpointView = Omit<
  IntegrationEndpoint,
  'secret_encrypted'
> & {
  _id: Types.ObjectId;
  has_secret: boolean;
};

/** Point de terminaison chargé avec son secret chiffré (usage interne). */
export type EndpointWithSecret = IntegrationEndpoint & { _id: Types.ObjectId };

/**
 * Configuration des points de terminaison sortants de l'ESB.
 * Le secret n'est accepté qu'en écriture et n'est restitué qu'une fois
 * (création si généré, rotation).
 */
@Injectable()
export class IntegrationEndpointService {
  private readonly logger = new Logger(IntegrationEndpointService.name);
  private readonly autoDisableAfter = positiveIntFromEnv(
    process.env.INTEGRATION_AUTO_DISABLE_AFTER,
    DEFAULT_AUTO_DISABLE_AFTER,
  );

  constructor(
    @InjectModel(IntegrationEndpoint.name)
    private readonly endpointModel: Model<IntegrationEndpoint>,
    private readonly cipher: SecretCipherService,
    private readonly delivery: EndpointDeliveryService,
    private readonly tenantScope: TenantScopeService,
  ) {}

  async create(
    dto: CreateIntegrationEndpointDto,
    actorId?: string,
  ): Promise<IntegrationEndpointView & { secret?: string }> {
    const organizationId = await resolveOrganization(
      this.tenantScope,
      dto.organization_id,
      dto.property_id,
    );
    const kind = dto.kind ?? IntegrationEndpointKind.WEBHOOK;
    const url = this.validateTarget(kind, dto.url);
    const headers = this.validateHeaders(dto.headers);
    const generated = !dto.secret;
    const secret = dto.secret ?? generateSigningSecret();

    const doc = await this.endpointModel.create({
      organization_id: new Types.ObjectId(organizationId),
      property_id: dto.property_id
        ? new Types.ObjectId(dto.property_id)
        : undefined,
      name: dto.name,
      description: dto.description,
      kind,
      url,
      broker_destination: dto.broker_destination,
      event_patterns: this.normalizePatterns(dto.event_patterns),
      headers,
      timeout_ms: dto.timeout_ms,
      max_attempts: dto.max_attempts,
      is_active: dto.is_active ?? true,
      secret_encrypted: this.cipher.encrypt(secret),
      secret_hint: secretHint(secret),
      created_by:
        actorId && Types.ObjectId.isValid(actorId)
          ? new Types.ObjectId(actorId)
          : undefined,
    });
    const view = this.toView(doc.toObject());
    // Le secret généré n'est restitué qu'à la création.
    return generated ? { ...view, secret } : view;
  }

  async findAll(
    query: IntegrationEndpointQueryDto,
  ): Promise<PaginatedResult<IntegrationEndpointView>> {
    const filter: Record<string, unknown> = { is_deleted: { $ne: true } };
    if (query.organization_id)
      filter.organization_id = toObjectId(query.organization_id);
    if (query.property_id) filter.property_id = toObjectId(query.property_id);
    if (query.kind) filter.kind = query.kind;
    if (query.is_active !== undefined)
      filter.is_active = query.is_active === 'true';

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const [rows, total] = await Promise.all([
      this.endpointModel
        .find(filter as QueryFilter<IntegrationEndpoint>)
        .sort(query.sort ?? '-created_at')
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      this.endpointModel
        .countDocuments(filter as QueryFilter<IntegrationEndpoint>)
        .exec(),
    ]);
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
    return {
      data: (rows as unknown as EndpointWithSecret[]).map((row) =>
        this.toView(row),
      ),
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async findOne(
    id: string,
    organizationId?: string,
  ): Promise<IntegrationEndpointView> {
    return this.toView(await this.load(id, organizationId));
  }

  async update(
    id: string,
    dto: UpdateIntegrationEndpointDto,
    organizationId?: string,
  ): Promise<IntegrationEndpointView> {
    const current = await this.load(id, organizationId);
    const set: Record<string, unknown> = {};
    const unset: Record<string, 1> = {};

    if (dto.property_id !== undefined) {
      await resolveOrganization(
        this.tenantScope,
        String(current.organization_id),
        dto.property_id,
      );
      set.property_id = new Types.ObjectId(dto.property_id);
    }
    const kind = dto.kind ?? current.kind;
    if (dto.kind !== undefined || dto.url !== undefined) {
      const url = this.validateTarget(kind, dto.url ?? current.url);
      set.kind = kind;
      if (url) set.url = url;
    }
    if (dto.name !== undefined) set.name = dto.name;
    if (dto.description !== undefined) set.description = dto.description;
    if (dto.broker_destination !== undefined)
      set.broker_destination = dto.broker_destination;
    if (dto.event_patterns !== undefined) {
      set.event_patterns = this.normalizePatterns(dto.event_patterns);
    }
    if (dto.headers !== undefined)
      set.headers = this.validateHeaders(dto.headers);
    if (dto.timeout_ms !== undefined) set.timeout_ms = dto.timeout_ms;
    if (dto.max_attempts !== undefined) set.max_attempts = dto.max_attempts;
    if (dto.is_active !== undefined) {
      set.is_active = dto.is_active;
      if (dto.is_active) {
        // Réactivation manuelle : remise à zéro du compteur d'échecs.
        set.consecutive_failures = 0;
        unset.disabled_at = 1;
        unset.disabled_reason = 1;
      } else {
        set.disabled_at = new Date();
        set.disabled_reason = 'Désactivé manuellement';
      }
    }

    const updated = await this.endpointModel
      .findOneAndUpdate(
        { _id: current._id, is_deleted: { $ne: true } },
        { $set: set, ...(Object.keys(unset).length ? { $unset: unset } : {}) },
        { new: true },
      )
      .lean()
      .exec();
    if (!updated)
      throw new NotFoundException('Point de terminaison introuvable');
    return this.toView(updated);
  }

  async remove(
    id: string,
    organizationId?: string,
  ): Promise<IntegrationEndpointView> {
    const current = await this.load(id, organizationId);
    const updated = await this.endpointModel
      .findOneAndUpdate(
        { _id: current._id },
        {
          $set: { is_deleted: true, deleted_at: new Date(), is_active: false },
        },
        { new: true },
      )
      .lean()
      .exec();
    return this.toView(updated as unknown as EndpointWithSecret);
  }

  /** Remplace le secret ; le nouveau secret n'est renvoyé qu'ici. */
  async rotateSecret(
    id: string,
    provided?: string,
    organizationId?: string,
  ): Promise<{ id: string; secret: string; secret_hint: string }> {
    const current = await this.load(id, organizationId);
    const secret = provided ?? generateSigningSecret();
    const hint = secretHint(secret);
    await this.endpointModel
      .updateOne(
        { _id: current._id },
        {
          $set: {
            secret_encrypted: this.cipher.encrypt(secret),
            secret_hint: hint,
          },
        },
      )
      .exec();
    return { id: String(current._id), secret, secret_hint: hint };
  }

  /** Envoie un événement de test `platform.ping` signé, de façon synchrone. */
  async test(
    id: string,
    organizationId?: string,
  ): Promise<
    DeliveryResult & { delivery_id: string; event: OutboundEnvelope }
  > {
    const endpoint = await this.loadWithSecret(id, organizationId);
    const deliveryId = `test-${randomUUID()}`;
    const envelope: OutboundEnvelope = {
      id: randomUUID(),
      name: PING_EVENT_NAME,
      occurred_at: new Date().toISOString(),
      organization_id: String(endpoint.organization_id),
      property_id: endpoint.property_id
        ? String(endpoint.property_id)
        : undefined,
      payload: {
        message: 'Test de connexion PleasantStay ESB',
        endpoint_id: String(endpoint._id),
      },
    };
    const result = await this.delivery.deliver(endpoint, {
      deliveryId,
      eventName: PING_EVENT_NAME,
      envelope: JSON.parse(JSON.stringify(envelope)) as OutboundEnvelope,
    });
    return { ...result, delivery_id: deliveryId, event: envelope };
  }

  /** Points de terminaison actifs d'une organisation (avec secret chiffré). */
  async findActiveForOrganization(
    organizationId: string,
  ): Promise<EndpointWithSecret[]> {
    return await this.endpointModel
      .find({
        organization_id: new Types.ObjectId(organizationId),
        is_active: true,
        is_deleted: { $ne: true },
      } as QueryFilter<IntegrationEndpoint>)
      .lean()
      .exec();
  }

  /** Chargement interne (répartiteur), secret compris, sans contrôle de suppression. */
  async findByIdWithSecret(
    id: Types.ObjectId | string,
  ): Promise<EndpointWithSecret | null> {
    return await this.endpointModel
      .findById(id)
      .select('+secret_encrypted')
      .lean()
      .exec();
  }

  async recordSuccess(id: Types.ObjectId): Promise<void> {
    await this.endpointModel
      .updateOne(
        { _id: id },
        {
          $set: { last_success_at: new Date(), consecutive_failures: 0 },
          $unset: { last_error: 1 },
        },
      )
      .exec();
  }

  /**
   * Enregistre un échec ; désactive le point de terminaison après
   * `INTEGRATION_AUTO_DISABLE_AFTER` échecs consécutifs (50 par défaut).
   */
  async recordFailure(id: Types.ObjectId, error: string): Promise<void> {
    const updated = await this.endpointModel
      .findOneAndUpdate(
        { _id: id },
        {
          $set: {
            last_failure_at: new Date(),
            last_error: error.slice(0, 1000),
          },
          $inc: { consecutive_failures: 1 },
        },
        { new: true },
      )
      .lean()
      .exec();
    if (
      updated &&
      updated.is_active &&
      updated.consecutive_failures >= this.autoDisableAfter
    ) {
      await this.disable(
        id,
        `Désactivé automatiquement après ${updated.consecutive_failures} échecs consécutifs`,
      );
    }
  }

  async disable(id: Types.ObjectId, reason: string): Promise<void> {
    const result = await this.endpointModel
      .updateOne(
        { _id: id, is_active: true },
        {
          $set: {
            is_active: false,
            disabled_at: new Date(),
            disabled_reason: reason.slice(0, 500),
          },
        },
      )
      .exec();
    if (result.modifiedCount) {
      this.logger.warn(
        `Point de terminaison ${String(id)} désactivé : ${reason}`,
      );
    }
  }

  toView(doc: EndpointWithSecret): IntegrationEndpointView {
    const { secret_encrypted, ...rest } = doc as EndpointWithSecret &
      Record<string, unknown>;
    return {
      ...(rest as unknown as IntegrationEndpointView),
      has_secret: !!(secret_encrypted ?? doc.secret_hint),
    };
  }

  private async load(
    id: string,
    organizationId?: string,
  ): Promise<EndpointWithSecret> {
    const filter: Record<string, unknown> = {
      _id: toObjectId(id),
      is_deleted: { $ne: true },
    };
    if (organizationId)
      filter.organization_id = toObjectId(organizationId, 'Organisation');
    const doc = await this.endpointModel
      .findOne(filter as QueryFilter<IntegrationEndpoint>)
      .lean()
      .exec();
    if (!doc)
      throw new NotFoundException(
        `Point de terminaison introuvable (id: ${id})`,
      );
    return doc;
  }

  private async loadWithSecret(
    id: string,
    organizationId?: string,
  ): Promise<EndpointWithSecret> {
    const current = await this.load(id, organizationId);
    const doc = await this.findByIdWithSecret(current._id);
    if (!doc)
      throw new NotFoundException(
        `Point de terminaison introuvable (id: ${id})`,
      );
    return doc;
  }

  private validateTarget(
    kind: IntegrationEndpointKind,
    url?: string,
  ): string | undefined {
    if (kind === IntegrationEndpointKind.BROKER) {
      return url ? this.checkUrl(url) : undefined;
    }
    if (!url)
      throw new BadRequestException("L'URL est obligatoire pour un webhook");
    return this.checkUrl(url);
  }

  private checkUrl(url: string): string {
    const check = checkUrlStatic(url, {
      isProduction: isProductionEnv(),
      allowPrivate: allowPrivateUrls(),
    });
    if (!check.ok) throw new BadRequestException(check.reason);
    return check.url.toString();
  }

  private validateHeaders(headers: unknown): Record<string, string> {
    const check = validateCustomHeaders(headers);
    if (!check.ok) throw new BadRequestException(check.reason);
    return check.headers;
  }

  private normalizePatterns(patterns: string[]): string[] {
    return [
      ...new Set(patterns.map((pattern) => pattern.trim().toLowerCase())),
    ];
  }
}
