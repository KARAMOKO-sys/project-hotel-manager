import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Model, QueryFilter, Types } from 'mongoose';
import { randomUUID } from 'crypto';
import {
  DEFAULT_DISPATCH_BATCH_SIZE,
  DELIVERY_LEASE_MS,
  DISPATCH_CONCURRENCY,
  positiveIntFromEnv,
} from '../integration-bus.constants';
import { DeliveryResult } from '../integration-bus.types';
import { OutboxMessage, OutboxStatus } from '../schemas/outbox-message.entity';
import { computeBackoffMs } from '../utils/backoff';
import { EndpointDeliveryService } from './endpoint-delivery.service';
import {
  EndpointWithSecret,
  IntegrationEndpointService,
} from './integration-endpoint.service';

export interface DispatchSummary {
  claimed: number;
  delivered: number;
  retried: number;
  dead: number;
  failed: number;
  /** Vrai si une passe était déjà en cours sur cette instance. */
  skipped?: boolean;
}

type ClaimedMessage = OutboxMessage & {
  _id: Types.ObjectId;
  lock_token: string;
};

/**
 * Répartiteur de la boîte d'envoi (toutes les 30 s + déclenchement manuel).
 *
 * Réservation atomique (`findOneAndUpdate` pending → delivering avec bail
 * `locked_until` et jeton `lock_token`) : deux instances ne livrent jamais
 * le même message ; un message dont le bail a expiré (instance arrêtée)
 * est repris. Les conclusions sont conditionnées au jeton du bail.
 *
 * Désactivable par instance avec `INTEGRATION_DISPATCHER_ENABLED=false`.
 */
@Injectable()
export class OutboxDispatcherService {
  private readonly logger = new Logger(OutboxDispatcherService.name);
  private running = false;
  readonly batchSize = positiveIntFromEnv(
    process.env.INTEGRATION_DISPATCH_BATCH_SIZE,
    DEFAULT_DISPATCH_BATCH_SIZE,
  );
  /** Remplaçables dans les tests. */
  now: () => Date = () => new Date();
  random: () => number = Math.random;

  constructor(
    @InjectModel(OutboxMessage.name)
    private readonly outboxModel: Model<OutboxMessage>,
    private readonly endpoints: IntegrationEndpointService,
    private readonly delivery: EndpointDeliveryService,
  ) {}

  @Cron(CronExpression.EVERY_30_SECONDS, {
    name: 'integration-outbox-dispatch',
  })
  async scheduledDispatch(): Promise<void> {
    if (process.env.INTEGRATION_DISPATCHER_ENABLED === 'false') return;
    if (this.running) return;
    this.running = true;
    try {
      const summary = await this.dispatchDue();
      if (summary.claimed > 0) {
        this.logger.log(
          `ESB : ${summary.claimed} message(s) traité(s) — ${summary.delivered} livré(s), ${summary.retried} replanifié(s), ${summary.dead} abandonné(s), ${summary.failed} en échec`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Répartiteur ESB en erreur : ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      this.running = false;
    }
  }

  /** Traite au plus `batchSize` messages dus (optionnellement d'une organisation). */
  async dispatchDue(
    options: { organizationId?: string; limit?: number } = {},
  ): Promise<DispatchSummary> {
    const limit = Math.min(options.limit ?? this.batchSize, this.batchSize);
    const summary: DispatchSummary = {
      claimed: 0,
      delivered: 0,
      retried: 0,
      dead: 0,
      failed: 0,
    };
    const endpointCache = new Map<string, Promise<EndpointWithSecret | null>>();
    let exhausted = false;

    const worker = async () => {
      while (!exhausted && summary.claimed < limit) {
        summary.claimed++;
        const message = await this.claimNext(options.organizationId);
        if (!message) {
          summary.claimed--;
          exhausted = true;
          return;
        }
        const key = String(message.endpoint_id);
        if (!endpointCache.has(key)) {
          endpointCache.set(
            key,
            this.endpoints.findByIdWithSecret(message.endpoint_id),
          );
        }
        const outcome = await this.process(
          message,
          await endpointCache.get(key)!,
        );
        summary[outcome]++;
      }
    };
    await Promise.all(
      Array.from({ length: Math.min(DISPATCH_CONCURRENCY, limit) }, () =>
        worker(),
      ),
    );
    return summary;
  }

  /** Réserve atomiquement le prochain message dû. */
  async claimNext(organizationId?: string): Promise<ClaimedMessage | null> {
    const now = this.now();
    const filter: Record<string, unknown> = {
      $or: [
        { status: OutboxStatus.PENDING, next_attempt_at: { $lte: now } },
        { status: OutboxStatus.DELIVERING, locked_until: { $lt: now } },
      ],
    };
    if (organizationId)
      filter.organization_id = new Types.ObjectId(organizationId);
    const lockToken = randomUUID();
    const claimed = await this.outboxModel
      .findOneAndUpdate(
        filter as QueryFilter<OutboxMessage>,
        {
          $set: {
            status: OutboxStatus.DELIVERING,
            locked_until: new Date(now.getTime() + DELIVERY_LEASE_MS),
            lock_token: lockToken,
            last_attempt_at: now,
          },
          $inc: { attempts: 1 },
        },
        { new: true, sort: { next_attempt_at: 1 } },
      )
      .lean()
      .exec();
    return claimed
      ? ({ ...(claimed as object), lock_token: lockToken } as ClaimedMessage)
      : null;
  }

  /** Livre un message réservé et applique la transition d'état. */
  async process(
    message: ClaimedMessage,
    endpoint: EndpointWithSecret | null,
  ): Promise<'delivered' | 'retried' | 'dead' | 'failed'> {
    if (!endpoint || endpoint.is_deleted) {
      await this.conclude(message, OutboxStatus.FAILED, {
        last_error: 'Point de terminaison supprimé',
      });
      return 'failed';
    }
    if (!endpoint.is_active) {
      await this.conclude(message, OutboxStatus.FAILED, {
        last_error: `Point de terminaison désactivé${endpoint.disabled_reason ? ` : ${endpoint.disabled_reason}` : ''}`,
      });
      return 'failed';
    }

    const result: DeliveryResult = await this.delivery.deliver(endpoint, {
      deliveryId: String(message._id),
      eventName: message.event_name,
      routingKey: message.topic,
      envelope: message.envelope,
    });
    const details = {
      last_status_code: result.status_code,
      last_latency_ms: result.latency_ms,
    };

    if (result.ok) {
      await this.conclude(
        message,
        OutboxStatus.DELIVERED,
        { ...details, delivered_at: this.now() },
        ['last_error'],
      );
      await this.endpoints.recordSuccess(endpoint._id);
      return 'delivered';
    }

    const error = result.error ?? 'Échec de livraison';
    await this.endpoints.recordFailure(endpoint._id, error);
    if (result.gone) {
      await this.endpoints.disable(
        endpoint._id,
        'Le destinataire a répondu HTTP 410 (Gone)',
      );
      await this.conclude(message, OutboxStatus.FAILED, {
        ...details,
        last_error: error,
      });
      return 'failed';
    }
    if (result.permanent) {
      await this.conclude(message, OutboxStatus.FAILED, {
        ...details,
        last_error: error,
      });
      return 'failed';
    }
    const maxAttempts = message.max_attempts ?? endpoint.max_attempts;
    if (message.attempts >= maxAttempts) {
      await this.conclude(message, OutboxStatus.DEAD, {
        ...details,
        last_error: error,
      });
      return 'dead';
    }
    const delay = computeBackoffMs(message.attempts, this.random);
    await this.conclude(message, OutboxStatus.PENDING, {
      ...details,
      last_error: error,
      next_attempt_at: new Date(this.now().getTime() + delay),
    });
    return 'retried';
  }

  /** Transition finale, uniquement si le bail est toujours détenu. */
  private async conclude(
    message: ClaimedMessage,
    status: OutboxStatus,
    set: Record<string, unknown>,
    extraUnset: string[] = [],
  ): Promise<void> {
    const unset: Record<string, 1> = { locked_until: 1, lock_token: 1 };
    for (const field of extraUnset) unset[field] = 1;
    const cleanSet = Object.fromEntries(
      Object.entries({ ...set, status }).filter(
        ([, value]) => value !== undefined,
      ),
    );
    const result = await this.outboxModel
      .updateOne(
        {
          _id: message._id,
          status: OutboxStatus.DELIVERING,
          lock_token: message.lock_token,
        },
        { $set: cleanSet, $unset: unset },
      )
      .exec();
    if (!result.modifiedCount) {
      this.logger.warn(
        `Bail perdu pour le message ${String(message._id)} (repris par une autre instance)`,
      );
    }
  }
}
