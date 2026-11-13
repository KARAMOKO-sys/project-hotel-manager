import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types, UpdateQuery } from 'mongoose';
import { BaseCrudService } from '../../common/services/base-crud.service';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { NotificationChannel } from '../../base-entities/enums/notification-channel.enum';
import {
  NotificationLog,
  NotificationLogDocument,
  NotificationStatus,
} from '../schemas/notification-log.entity';
import { CreateNotificationLogDto } from '../dto/create-notification-log.dto';
import { UpdateNotificationLogDto } from '../dto/update-notification-log.dto';
import {
  MarkAsSentDto,
  NotificationLogQueryDto,
  NotificationStatsQueryDto,
} from '../dto/notification-log-actions.dto';

/** Statistiques d'envoi des notifications. */
export interface NotificationStats {
  total: number;
  by_status: Record<string, number>;
  by_channel: Record<string, Record<string, number>>;
  delivery_rate: number;
  failure_rate: number;
}

/** Délai de base avant renvoi (backoff exponentiel), en millisecondes. */
const RETRY_BASE_DELAY_MS = 5 * 60 * 1000;

/**
 * Service du journal des notifications.
 *
 * Gère le cycle de vie d'une notification :
 * `queued → sent → delivered → read`, ou `queued/sent → failed → (retry) queued`.
 */
@Injectable()
export class NotificationLogService extends BaseCrudService<
  NotificationLog,
  CreateNotificationLogDto,
  UpdateNotificationLogDto
> {
  constructor(
    @InjectModel(NotificationLog.name)
    protected readonly notificationLogModel: Model<NotificationLogDocument>,
  ) {
    super(notificationLogModel, NotificationLog.name);
  }

  /** Journalise une notification à envoyer (statut `queued`). */
  async create(dto: CreateNotificationLogDto): Promise<NotificationLog> {
    if (!dto.recipient_id && !dto.recipient_address) {
      throw new BadRequestException(
        'Un destinataire (recipient_id ou recipient_address) est requis',
      );
    }
    return super.create({
      ...dto,
      status: NotificationStatus.QUEUED,
      retry_count: 0,
    } as CreateNotificationLogDto);
  }

  /** Liste paginée avec filtres (établissement, canal, statut, modèle). */
  async findAll(
    query: NotificationLogQueryDto,
    filter: QueryFilter<NotificationLog> = {},
  ): Promise<PaginatedResult<NotificationLog>> {
    const criteria: Record<string, unknown> = { ...filter };
    if (query.property_id) {
      criteria.property_id = new Types.ObjectId(query.property_id);
    }
    if (query.channel) criteria.channel = query.channel;
    if (query.status) criteria.status = query.status;
    if (query.template) criteria.template = query.template;
    return super.findAll(query, criteria as QueryFilter<NotificationLog>);
  }

  /** Historique des notifications d'un destinataire. */
  findByRecipient(recipientId: string, query: PaginationQueryDto) {
    return super.findAll(query, {
      recipient_id: new Types.ObjectId(recipientId),
    } as QueryFilter<NotificationLog>);
  }

  /** Notifications in-app non lues d'un destinataire. */
  async findUnread(recipientId: string): Promise<NotificationLog[]> {
    return this.notificationLogModel
      .find({
        recipient_id: new Types.ObjectId(recipientId),
        channel: NotificationChannel.IN_APP,
        status: {
          $in: [NotificationStatus.SENT, NotificationStatus.DELIVERED],
        },
        is_deleted: { $ne: true },
      })
      .sort({ created_at: -1 })
      .lean()
      .exec() as unknown as Promise<NotificationLog[]>;
  }

  /** Marque une notification en file comme envoyée. */
  markAsSent(id: string, dto: MarkAsSentDto = {}): Promise<NotificationLog> {
    return this.transition(id, [NotificationStatus.QUEUED], {
      status: NotificationStatus.SENT,
      sent_at: new Date(),
      ...(dto.provider_message_id && {
        provider_message_id: dto.provider_message_id,
      }),
      ...(dto.provider && { provider: dto.provider }),
      $unset: { error_message: 1, next_retry_at: 1 },
    });
  }

  /** Confirme la remise de la notification au destinataire. */
  markAsDelivered(id: string): Promise<NotificationLog> {
    return this.transition(id, [NotificationStatus.SENT], {
      status: NotificationStatus.DELIVERED,
      delivered_at: new Date(),
    });
  }

  /** Marque une notification comme lue (idempotent). */
  async markAsRead(id: string): Promise<NotificationLog> {
    const current = await this.findOne(id);
    if (current.status === NotificationStatus.READ) {
      return current;
    }
    return this.transition(
      id,
      [NotificationStatus.SENT, NotificationStatus.DELIVERED],
      { status: NotificationStatus.READ, read_at: new Date() },
      current,
    );
  }

  /**
   * Marque une notification comme échouée et planifie le prochain renvoi
   * (backoff exponentiel) tant que le nombre maximal n'est pas atteint.
   */
  async markAsFailed(
    id: string,
    errorMessage: string,
  ): Promise<NotificationLog> {
    const current = await this.findOne(id);
    const canRetry = current.retry_count < current.max_retries;
    const update: UpdateQuery<NotificationLog> = {
      status: NotificationStatus.FAILED,
      failed_at: new Date(),
      error_message: errorMessage,
    };
    if (canRetry) {
      update.next_retry_at = new Date(
        Date.now() + RETRY_BASE_DELAY_MS * 2 ** current.retry_count,
      );
    } else {
      update.$unset = { next_retry_at: 1 };
    }
    return this.transition(
      id,
      [NotificationStatus.QUEUED, NotificationStatus.SENT],
      update,
      current,
    );
  }

  /** Remet en file une notification échouée (incrémente le compteur). */
  async retry(id: string): Promise<NotificationLog> {
    const current = await this.findOne(id);
    if (
      current.status === NotificationStatus.FAILED &&
      current.retry_count >= current.max_retries
    ) {
      throw new BadRequestException(
        `Nombre maximal de tentatives atteint (${current.max_retries})`,
      );
    }
    return this.transition(
      id,
      [NotificationStatus.FAILED],
      {
        status: NotificationStatus.QUEUED,
        $inc: { retry_count: 1 },
        $unset: { next_retry_at: 1 },
      },
      current,
    );
  }

  /** Notifications échouées dont le renvoi est dû. */
  async findPendingRetries(limit = 50): Promise<NotificationLog[]> {
    return this.notificationLogModel
      .find({
        status: NotificationStatus.FAILED,
        next_retry_at: { $lte: new Date() },
        is_deleted: { $ne: true },
        $expr: { $lt: ['$retry_count', '$max_retries'] },
      })
      .sort({ next_retry_at: 1 })
      .limit(limit)
      .lean()
      .exec() as unknown as Promise<NotificationLog[]>;
  }

  /** Statistiques par statut et par canal sur une période. */
  async getStats(
    query: NotificationStatsQueryDto = {},
  ): Promise<NotificationStats> {
    const from = query.from ? new Date(query.from) : undefined;
    const to = query.to ? new Date(query.to) : undefined;
    if (from && to && from > to) {
      throw new BadRequestException(
        'La date de début doit précéder la date de fin',
      );
    }

    const match: Record<string, unknown> = { is_deleted: { $ne: true } };
    if (query.property_id) {
      match.property_id = new Types.ObjectId(query.property_id);
    }
    if (from || to) {
      const range: Record<string, Date> = {};
      if (from) range.$gte = from;
      if (to) range.$lte = to;
      match.created_at = range;
    }

    const rows = await this.notificationLogModel
      .aggregate<{
        _id: { channel: string; status: string };
        count: number;
      }>([
        { $match: match },
        {
          $group: {
            _id: { channel: '$channel', status: '$status' },
            count: { $sum: 1 },
          },
        },
      ])
      .exec();

    const stats: NotificationStats = {
      total: 0,
      by_status: {},
      by_channel: {},
      delivery_rate: 0,
      failure_rate: 0,
    };
    for (const { _id, count } of rows) {
      stats.total += count;
      stats.by_status[_id.status] = (stats.by_status[_id.status] ?? 0) + count;
      const channel = (stats.by_channel[_id.channel] ??= {});
      channel[_id.status] = (channel[_id.status] ?? 0) + count;
    }

    if (stats.total > 0) {
      const delivered =
        (stats.by_status[NotificationStatus.DELIVERED] ?? 0) +
        (stats.by_status[NotificationStatus.READ] ?? 0);
      const failed = stats.by_status[NotificationStatus.FAILED] ?? 0;
      stats.delivery_rate = Math.round((delivered / stats.total) * 10000) / 100;
      stats.failure_rate = Math.round((failed / stats.total) * 10000) / 100;
    }
    return stats;
  }

  /**
   * Applique une transition de statut de manière atomique : la mise à jour
   * n'est effectuée que si le statut courant fait partie de `allowedFrom`.
   */
  private async transition(
    id: string,
    allowedFrom: NotificationStatus[],
    update: UpdateQuery<NotificationLog>,
    current?: NotificationLog,
  ): Promise<NotificationLog> {
    const doc = current ?? (await this.findOne(id));
    if (!allowedFrom.includes(doc.status)) {
      throw new BadRequestException(
        `Transition impossible depuis le statut « ${doc.status} »`,
      );
    }
    const updated = (await this.notificationLogModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), status: { $in: allowedFrom } },
        update,
        { new: true },
      )
      .exec()) as unknown as NotificationLog | null;
    if (!updated) {
      throw new BadRequestException(
        'La notification a été modifiée entre-temps, veuillez réessayer',
      );
    }
    return updated;
  }
}
