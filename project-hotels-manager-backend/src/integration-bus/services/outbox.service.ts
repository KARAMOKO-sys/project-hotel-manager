import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { AnyBulkWriteOperation, Model, QueryFilter, Types } from 'mongoose';
import { DomainEvent } from '../../platform/events/domain-events';
import { AppsService } from '../../platform/apps/apps.service';
import { TenantScopeService } from '../../platform/tenancy/tenant-scope.service';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { INTEGRATION_BUS_APP_KEY } from '../integration-bus.constants';
import { toOutboundEnvelope } from '../integration-bus.types';
import { OutboxMessage, OutboxStatus } from '../schemas/outbox-message.entity';
import { IntegrationEndpoint } from '../schemas/integration-endpoint.entity';
import { OutboxQueryDto } from '../dto/outbox-query.dto';
import { matchesAnyPattern } from '../utils/pattern-matcher';
import { IntegrationEndpointService } from './integration-endpoint.service';
import { toObjectId } from './integration-scope.helper';

export interface EnqueueResult {
  organization_id?: string;
  matched: number;
  inserted: number;
  skipped?: 'no_organization' | 'app_not_installed';
}

export interface IntegrationStats {
  outbox: Record<OutboxStatus, number> & { total: number };
  last_24h: {
    attempted: number;
    delivered: number;
    not_delivered: number;
    /** Pourcentage (0–100) des messages tentés sur 24 h qui sont livrés. */
    success_rate: number | null;
  };
  endpoints: { active: number; inactive: number };
}

/**
 * Boîte d'envoi de l'ESB : mise en file idempotente (insertion seule, aucun
 * appel réseau pendant la requête métier), consultation, relance, statistiques.
 */
@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);

  constructor(
    @InjectModel(OutboxMessage.name)
    private readonly outboxModel: Model<OutboxMessage>,
    @InjectModel(IntegrationEndpoint.name)
    private readonly endpointModel: Model<IntegrationEndpoint>,
    private readonly endpoints: IntegrationEndpointService,
    private readonly apps: AppsService,
    private readonly tenantScope: TenantScopeService,
  ) {}

  /**
   * Insère un message par point de terminaison actif abonné à l'événement.
   * Idempotent : unique (event_id, endpoint_id) + upsert `$setOnInsert`,
   * un événement rejoué n'est donc jamais mis en file deux fois.
   */
  async enqueue(
    event: DomainEvent<object>,
    topic?: string,
  ): Promise<EnqueueResult> {
    if (!event?.id || !event?.name) return { matched: 0, inserted: 0 };
    const organizationId =
      (event.organization_id && Types.ObjectId.isValid(event.organization_id)
        ? event.organization_id
        : null) ??
      (event.property_id
        ? await this.tenantScope.getOrganizationIdForProperty(event.property_id)
        : null);
    if (!organizationId) {
      return { matched: 0, inserted: 0, skipped: 'no_organization' };
    }
    if (
      !(await this.apps.isInstalled(organizationId, INTEGRATION_BUS_APP_KEY))
    ) {
      return {
        organization_id: organizationId,
        matched: 0,
        inserted: 0,
        skipped: 'app_not_installed',
      };
    }

    const names = [event.name, topic];
    const endpoints = (
      await this.endpoints.findActiveForOrganization(organizationId)
    ).filter(
      (endpoint) =>
        (!endpoint.property_id ||
          (!!event.property_id &&
            String(endpoint.property_id) === String(event.property_id))) &&
        matchesAnyPattern(names, endpoint.event_patterns),
    );
    if (!endpoints.length)
      return { organization_id: organizationId, matched: 0, inserted: 0 };

    const envelope = toOutboundEnvelope({
      ...event,
      organization_id: organizationId,
    });
    const now = new Date();
    const operations: AnyBulkWriteOperation<OutboxMessage>[] = endpoints.map(
      (endpoint) => ({
        updateOne: {
          filter: { event_id: event.id, endpoint_id: endpoint._id },
          update: {
            $setOnInsert: {
              event_id: event.id,
              event_name: event.name,
              ...(topic ? { topic } : {}),
              organization_id: new Types.ObjectId(organizationId),
              ...(event.property_id && Types.ObjectId.isValid(event.property_id)
                ? { property_id: new Types.ObjectId(event.property_id) }
                : {}),
              endpoint_id: endpoint._id,
              envelope,
              status: OutboxStatus.PENDING,
              attempts: 0,
              max_attempts: endpoint.max_attempts,
              next_attempt_at: now,
            },
          },
          upsert: true,
        },
      }),
    );
    try {
      const result = await this.outboxModel.bulkWrite(operations, {
        ordered: false,
      });
      return {
        organization_id: organizationId,
        matched: endpoints.length,
        inserted: result.upsertedCount,
      };
    } catch (error) {
      // Course entre deux insertions concurrentes du même couple : déjà en file.
      if ((error as { code?: number }).code === 11000) {
        const inserted =
          (error as { result?: { upsertedCount?: number } }).result
            ?.upsertedCount ?? 0;
        return {
          organization_id: organizationId,
          matched: endpoints.length,
          inserted,
        };
      }
      throw error;
    }
  }

  async findAll(
    query: OutboxQueryDto,
  ): Promise<PaginatedResult<OutboxMessage>> {
    const filter: Record<string, unknown> = {};
    if (query.organization_id)
      filter.organization_id = toObjectId(query.organization_id);
    if (query.property_id) filter.property_id = toObjectId(query.property_id);
    if (query.endpoint_id) filter.endpoint_id = toObjectId(query.endpoint_id);
    if (query.status) filter.status = query.status;
    if (query.event) filter.event_name = query.event;
    if (query.event_id) filter.event_id = query.event_id;

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const [data, total] = await Promise.all([
      this.outboxModel
        .find(filter as QueryFilter<OutboxMessage>)
        .select('-lock_token')
        .sort(query.sort ?? '-created_at')
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      this.outboxModel
        .countDocuments(filter as QueryFilter<OutboxMessage>)
        .exec(),
    ]);
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
    return {
      data: data as unknown as OutboxMessage[],
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

  /** Remet un message `dead` ou `failed` en file (compteur de tentatives remis à zéro). */
  async retry(id: string, organizationId?: string): Promise<OutboxMessage> {
    const filter: Record<string, unknown> = { _id: toObjectId(id) };
    if (organizationId)
      filter.organization_id = toObjectId(organizationId, 'Organisation');
    const updated = await this.outboxModel
      .findOneAndUpdate(
        {
          ...filter,
          status: { $in: [OutboxStatus.DEAD, OutboxStatus.FAILED] },
        } as QueryFilter<OutboxMessage>,
        {
          $set: {
            status: OutboxStatus.PENDING,
            attempts: 0,
            next_attempt_at: new Date(),
          },
          $unset: { locked_until: 1, lock_token: 1 },
        },
        { new: true },
      )
      .select('-lock_token')
      .lean()
      .exec();
    if (updated) return updated;
    const exists = await this.outboxModel.exists(
      filter as QueryFilter<OutboxMessage>,
    );
    if (!exists) throw new NotFoundException(`Message introuvable (id: ${id})`);
    throw new BadRequestException(
      'Seuls les messages en échec (« failed ») ou abandonnés (« dead ») peuvent être relancés',
    );
  }

  async getStats(organizationId?: string): Promise<IntegrationStats> {
    const scope: Record<string, unknown> = {};
    if (organizationId)
      scope.organization_id = toObjectId(organizationId, 'Organisation');
    const since = new Date(Date.now() - 24 * 3600_000);

    const [byStatus, recent, endpointRows] = await Promise.all([
      this.outboxModel
        .aggregate<{ _id: OutboxStatus; count: number }>([
          { $match: scope },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ])
        .exec(),
      this.outboxModel
        .aggregate<{ _id: boolean; count: number }>([
          { $match: { ...scope, last_attempt_at: { $gte: since } } },
          {
            $group: {
              _id: { $eq: ['$status', OutboxStatus.DELIVERED] },
              count: { $sum: 1 },
            },
          },
        ])
        .exec(),
      this.endpointModel
        .aggregate<{ _id: boolean; count: number }>([
          { $match: { ...scope, is_deleted: { $ne: true } } },
          { $group: { _id: '$is_active', count: { $sum: 1 } } },
        ])
        .exec(),
    ]);

    const outbox = Object.fromEntries(
      Object.values(OutboxStatus).map((status) => [status, 0]),
    ) as Record<OutboxStatus, number> & { total: number };
    outbox.total = 0;
    for (const row of byStatus) {
      outbox[row._id] = row.count;
      outbox.total += row.count;
    }
    const delivered = recent.find((row) => row._id === true)?.count ?? 0;
    const notDelivered = recent.find((row) => row._id === false)?.count ?? 0;
    const attempted = delivered + notDelivered;
    return {
      outbox,
      last_24h: {
        attempted,
        delivered,
        not_delivered: notDelivered,
        success_rate: attempted
          ? Math.round((delivered / attempted) * 10000) / 100
          : null,
      },
      endpoints: {
        active: endpointRows.find((row) => row._id === true)?.count ?? 0,
        inactive: endpointRows
          .filter((row) => row._id !== true)
          .reduce((sum, row) => sum + row.count, 0),
      },
    };
  }
}
