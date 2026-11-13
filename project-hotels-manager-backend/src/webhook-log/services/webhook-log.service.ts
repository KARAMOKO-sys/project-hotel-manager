import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types, UpdateQuery } from 'mongoose';
import { BaseCrudService } from '../../common/services/base-crud.service';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import {
  WebhookLog,
  WebhookLogDocument,
  WebhookProvider,
  WebhookStatus,
} from '../schemas/webhook-log.entity';
import { CreateWebhookLogDto } from '../dto/create-webhook-log.dto';
import { UpdateWebhookLogDto } from '../dto/update-webhook-log.dto';
import {
  MarkWebhookProcessedDto,
  WebhookLogQueryDto,
} from '../dto/webhook-log-actions.dto';

/** Statistiques des webhooks par fournisseur et statut. */
export interface WebhookStats {
  total: number;
  by_provider: Record<string, Record<string, number>>;
  by_status: Record<string, number>;
  success_rate: number;
}

/**
 * Service du journal des webhooks entrants (Stripe, Mobile Money, OTAs…).
 *
 * Cycle de vie : `received → processing → processed | failed`, un webhook
 * échoué pouvant être remis en `received` tant que le nombre maximal de
 * tentatives n'est pas atteint. Les événements déjà reçus (même `event_id`)
 * sont journalisés comme doublons et ignorés.
 */
@Injectable()
export class WebhookLogService extends BaseCrudService<
  WebhookLog,
  CreateWebhookLogDto,
  UpdateWebhookLogDto
> {
  constructor(
    @InjectModel(WebhookLog.name)
    protected readonly webhookLogModel: Model<WebhookLogDocument>,
  ) {
    super(webhookLogModel, WebhookLog.name);
  }

  /** Journalise un webhook reçu en détectant les doublons. */
  async create(dto: CreateWebhookLogDto): Promise<WebhookLog> {
    const duplicate = dto.event_id
      ? await this.repository.exists({
          provider: dto.provider,
          event_id: dto.event_id,
          is_duplicate: { $ne: true },
          is_deleted: { $ne: true },
        } as QueryFilter<WebhookLog>)
      : false;

    return super.create({
      ...dto,
      received_at: new Date(),
      attempts: 0,
      is_duplicate: duplicate,
      status: duplicate ? WebhookStatus.IGNORED : WebhookStatus.RECEIVED,
    } as CreateWebhookLogDto);
  }

  /** Liste paginée avec filtres (fournisseur, statut, type, période). */
  async findAll(
    query: WebhookLogQueryDto,
    filter: QueryFilter<WebhookLog> = {},
  ): Promise<PaginatedResult<WebhookLog>> {
    const criteria: Record<string, unknown> = { ...filter };
    if (query.provider) criteria.provider = query.provider;
    if (query.status) criteria.status = query.status;
    if (query.event_type) criteria.event_type = query.event_type;
    if (query.property_id) {
      criteria.property_id = new Types.ObjectId(query.property_id);
    }
    const range = this.buildRange(query.from, query.to);
    if (range) criteria.received_at = range;
    return super.findAll(query, criteria as QueryFilter<WebhookLog>);
  }

  /** Retrouve l'événement original d'un fournisseur par son identifiant. */
  findByEvent(provider: WebhookProvider, eventId: string): Promise<WebhookLog> {
    return this.findOneOrFail({
      provider,
      event_id: eventId,
      is_duplicate: { $ne: true },
    } as QueryFilter<WebhookLog>);
  }

  /** Webhooks échoués pouvant encore être retraités. */
  async findRetryable(limit = 50): Promise<WebhookLog[]> {
    return this.webhookLogModel
      .find({
        status: WebhookStatus.FAILED,
        is_deleted: { $ne: true },
        $expr: { $lt: ['$attempts', '$max_attempts'] },
      })
      .sort({ received_at: 1 })
      .limit(limit)
      .lean()
      .exec() as unknown as Promise<WebhookLog[]>;
  }

  /** Enregistre le résultat de la vérification de signature. */
  setSignatureVerification(id: string, verified: boolean): Promise<WebhookLog> {
    return super.update(id, {
      signature_verified: verified,
    } as unknown as UpdateWebhookLogDto);
  }

  /**
   * Démarre le traitement d'un webhook (incrémente les tentatives).
   * Refusé si la signature fournie n'a pas été vérifiée ou si le nombre
   * maximal de tentatives est atteint.
   */
  async markAsProcessing(id: string): Promise<WebhookLog> {
    const current = await this.findOne(id);
    if (current.signature && !current.signature_verified) {
      throw new BadRequestException(
        'La signature du webhook doit être vérifiée avant traitement',
      );
    }
    if (current.attempts >= current.max_attempts) {
      throw new BadRequestException(
        `Nombre maximal de tentatives atteint (${current.max_attempts})`,
      );
    }
    return this.transition(
      id,
      [WebhookStatus.RECEIVED],
      {
        status: WebhookStatus.PROCESSING,
        last_attempt_at: new Date(),
        $inc: { attempts: 1 },
      },
      current,
    );
  }

  /** Marque un webhook comme traité avec succès. */
  markAsProcessed(
    id: string,
    dto: MarkWebhookProcessedDto = {},
  ): Promise<WebhookLog> {
    const update: UpdateQuery<WebhookLog> = {
      status: WebhookStatus.PROCESSED,
      processed_at: new Date(),
      $unset: { error_message: 1 },
    };
    if (dto.result) update.result = dto.result;
    if (dto.related_entity_type) {
      update.related_entity_type = dto.related_entity_type;
    }
    if (dto.related_entity_id) {
      update.related_entity_id = new Types.ObjectId(dto.related_entity_id);
    }
    return this.transition(
      id,
      [WebhookStatus.RECEIVED, WebhookStatus.PROCESSING],
      update,
    );
  }

  /** Marque un webhook comme échoué. */
  markAsFailed(id: string, errorMessage: string): Promise<WebhookLog> {
    return this.transition(
      id,
      [WebhookStatus.RECEIVED, WebhookStatus.PROCESSING],
      {
        status: WebhookStatus.FAILED,
        error_message: errorMessage,
        last_attempt_at: new Date(),
      },
    );
  }

  /** Ignore volontairement un webhook (événement non pertinent). */
  markAsIgnored(id: string, reason?: string): Promise<WebhookLog> {
    return this.transition(id, [WebhookStatus.RECEIVED, WebhookStatus.FAILED], {
      status: WebhookStatus.IGNORED,
      ...(reason && { notes: reason }),
    });
  }

  /** Remet un webhook échoué en attente de traitement. */
  async retry(id: string): Promise<WebhookLog> {
    const current = await this.findOne(id);
    if (
      current.status === WebhookStatus.FAILED &&
      current.attempts >= current.max_attempts
    ) {
      throw new BadRequestException(
        `Nombre maximal de tentatives atteint (${current.max_attempts})`,
      );
    }
    return this.transition(
      id,
      [WebhookStatus.FAILED],
      { status: WebhookStatus.RECEIVED },
      current,
    );
  }

  /** Statistiques par fournisseur et statut sur une période. */
  async getStats(
    provider?: WebhookProvider,
    from?: string,
    to?: string,
  ): Promise<WebhookStats> {
    const match: Record<string, unknown> = { is_deleted: { $ne: true } };
    if (provider) match.provider = provider;
    const range = this.buildRange(from, to);
    if (range) match.received_at = range;

    const rows = await this.webhookLogModel
      .aggregate<{
        _id: { provider: string; status: string };
        count: number;
      }>([
        { $match: match },
        {
          $group: {
            _id: { provider: '$provider', status: '$status' },
            count: { $sum: 1 },
          },
        },
      ])
      .exec();

    const stats: WebhookStats = {
      total: 0,
      by_provider: {},
      by_status: {},
      success_rate: 0,
    };
    for (const { _id, count } of rows) {
      stats.total += count;
      stats.by_status[_id.status] = (stats.by_status[_id.status] ?? 0) + count;
      const bucket = (stats.by_provider[_id.provider] ??= {});
      bucket[_id.status] = (bucket[_id.status] ?? 0) + count;
    }
    const processed = stats.by_status[WebhookStatus.PROCESSED] ?? 0;
    const failed = stats.by_status[WebhookStatus.FAILED] ?? 0;
    if (processed + failed > 0) {
      stats.success_rate =
        Math.round((processed / (processed + failed)) * 10000) / 100;
    }
    return stats;
  }

  private buildRange(
    from?: string,
    to?: string,
  ): Record<string, Date> | undefined {
    if (!from && !to) return undefined;
    const range: Record<string, Date> = {};
    if (from) range.$gte = new Date(from);
    if (to) range.$lte = new Date(to);
    if (range.$gte && range.$lte && range.$gte > range.$lte) {
      throw new BadRequestException(
        'La date de début doit précéder la date de fin',
      );
    }
    return range;
  }

  /** Transition de statut atomique (conditionnée au statut courant). */
  private async transition(
    id: string,
    allowedFrom: WebhookStatus[],
    update: UpdateQuery<WebhookLog>,
    current?: WebhookLog,
  ): Promise<WebhookLog> {
    const doc = current ?? (await this.findOne(id));
    if (!allowedFrom.includes(doc.status)) {
      throw new BadRequestException(
        `Transition impossible depuis le statut « ${doc.status} »`,
      );
    }
    const updated = (await this.webhookLogModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), status: { $in: allowedFrom } },
        update,
        { new: true },
      )
      .exec()) as unknown as WebhookLog | null;
    if (!updated) {
      throw new BadRequestException(
        'Le webhook a été modifié entre-temps, veuillez réessayer',
      );
    }
    return updated;
  }
}
