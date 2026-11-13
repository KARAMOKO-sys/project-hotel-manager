import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseCrudService } from '../../common/services/base-crud.service';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { LoyaltyTier } from '../../base-entities/enums/loyalty-tier.enum';
import {
  Waitlist,
  WaitlistDocument,
  WaitlistStatus,
  WAITLIST_CONFIRMATION_DELAY_HOURS,
  WAITLIST_LOYALTY_PRIORITY,
} from '../schemas/waitlist.entity';
import { CreateWaitlistDto } from '../dto/create-waitlist.dto';
import { UpdateWaitlistDto } from '../dto/update-waitlist.dto';
import { NotifyAvailabilityDto } from '../dto/waitlist-actions.dto';

const DAY_MS = 24 * 60 * 60 * 1000;
/** Flexibilité maximale acceptée (cf. DTO), utilisée pour le pré-filtrage. */
const MAX_FLEXIBILITY_DAYS = 14;

/** Statuts considérés comme « actifs » dans la file d'attente. */
const ACTIVE_STATUSES = [WaitlistStatus.WAITING, WaitlistStatus.NOTIFIED];

export interface WaitlistPosition {
  id: string;
  position: number;
  total_waiting: number;
}

export interface WaitlistStatistics {
  total: number;
  current_size: number;
  by_status: Record<WaitlistStatus, number>;
  conversion_rate: number;
  expiration_rate: number;
}

/**
 * Service de gestion de la liste d'attente.
 *
 * Règles métier :
 *  - priorité aux clients fidèles (bonus selon le niveau de fidélité) puis
 *    ancienneté de l'inscription ;
 *  - lorsqu'une disponibilité se libère, les clients compatibles sont notifiés
 *    et disposent de 4 h pour confirmer, sans quoi l'entrée expire.
 */
@Injectable()
export class WaitlistService extends BaseCrudService<
  Waitlist,
  CreateWaitlistDto,
  UpdateWaitlistDto
> {
  private readonly logger = new Logger(WaitlistService.name);

  constructor(
    @InjectModel(Waitlist.name)
    protected readonly waitlistModel: Model<WaitlistDocument>,
  ) {
    super(waitlistModel, Waitlist.name);
  }

  /**
   * Ajoute un client à la liste d'attente (`addToWaitlist`).
   * Lève 400 si les dates sont invalides, 409 si le client a déjà une entrée
   * active qui chevauche ce séjour.
   */
  async create(dto: CreateWaitlistDto): Promise<Waitlist> {
    const { checkIn, checkOut } = this.parseStay(dto.check_in, dto.check_out);
    this.assertNotInPast(checkIn);

    const duplicate = await this.waitlistModel
      .findOne({
        property_id: this.toObjectId(dto.property_id, 'property_id'),
        guest_id: this.toObjectId(dto.guest_id, 'guest_id'),
        status: { $in: ACTIVE_STATUSES },
        is_deleted: { $ne: true },
        check_in: { $lt: checkOut },
        check_out: { $gt: checkIn },
      })
      .exec();
    if (duplicate) {
      throw new ConflictException(
        'Ce client est déjà en liste d’attente sur cette période',
      );
    }

    const { priority_boost, ...data } = dto;
    const tier = dto.loyalty_tier ?? LoyaltyTier.BRONZE;

    return super.create({
      ...data,
      check_in: checkIn,
      check_out: checkOut,
      loyalty_tier: tier,
      priority: this.computePriority(tier, priority_boost),
      status: WaitlistStatus.WAITING,
    } as unknown as CreateWaitlistDto);
  }

  /**
   * Met à jour une entrée encore en attente (dates, préférences, priorité).
   */
  async update(id: string, dto: UpdateWaitlistDto): Promise<Waitlist> {
    const existing = await this.findOne(id);
    if (existing.status !== WaitlistStatus.WAITING) {
      throw new BadRequestException(
        `Seule une entrée en attente peut être modifiée (statut: ${existing.status})`,
      );
    }

    const { checkIn, checkOut } = this.parseStay(
      dto.check_in ?? existing.check_in,
      dto.check_out ?? existing.check_out,
    );
    const { priority_boost, ...data } = dto;
    const tier = dto.loyalty_tier ?? existing.loyalty_tier;
    const currentBoost =
      existing.priority -
      (WAITLIST_LOYALTY_PRIORITY[existing.loyalty_tier] ?? 0);

    return super.update(id, {
      ...data,
      check_in: checkIn,
      check_out: checkOut,
      priority: this.computePriority(tier, priority_boost ?? currentBoost),
    } as unknown as UpdateWaitlistDto);
  }

  /** Liste paginée des entrées d'une propriété (par priorité puis ancienneté). */
  findByProperty(
    propertyId: string,
    query: PaginationQueryDto,
    status?: WaitlistStatus,
  ) {
    const filter: Record<string, unknown> = {
      property_id: this.toObjectId(propertyId, 'property_id'),
    };
    if (status) {
      filter.status = status;
    }
    return this.findAll(query, filter);
  }

  /** Liste paginée des entrées d'un client. */
  findByGuest(guestId: string, query: PaginationQueryDto) {
    return this.findAll(query, {
      guest_id: this.toObjectId(guestId, 'guest_id'),
    });
  }

  /**
   * Position du client dans la file de sa propriété (1 = prochain servi).
   * Lève 400 si l'entrée n'est plus en attente.
   */
  async getPosition(id: string): Promise<WaitlistPosition> {
    const entry = await this.findOne(id);
    if (entry.status !== WaitlistStatus.WAITING) {
      throw new BadRequestException(
        `L’entrée n’est plus en attente (statut: ${entry.status})`,
      );
    }

    const base = {
      property_id: entry.property_id,
      status: WaitlistStatus.WAITING,
      is_deleted: { $ne: true },
    };
    const [ahead, total] = await Promise.all([
      this.waitlistModel
        .countDocuments({
          ...base,
          $or: [
            { priority: { $gt: entry.priority } },
            { priority: entry.priority, created_at: { $lt: entry.created_at } },
          ],
        })
        .exec(),
      this.waitlistModel.countDocuments(base).exec(),
    ]);

    return { id, position: ahead + 1, total_waiting: total };
  }

  /**
   * Entrées en attente compatibles avec une disponibilité, triées par
   * priorité (fidélité) puis ancienneté. Tient compte du type de chambre
   * (ou des types alternatifs acceptés) et de la flexibilité des dates.
   */
  async findMatchingEntries(
    propertyId: string,
    startDate: string | Date,
    endDate: string | Date,
    roomTypeId?: string,
  ): Promise<Waitlist[]> {
    const { checkIn: start, checkOut: end } = this.parseStay(
      startDate,
      endDate,
    );
    const margin = MAX_FLEXIBILITY_DAYS * DAY_MS;

    const filter: Record<string, unknown> = {
      property_id: this.toObjectId(propertyId, 'property_id'),
      status: WaitlistStatus.WAITING,
      is_deleted: { $ne: true },
      check_in: { $lt: new Date(end.getTime() + margin) },
      check_out: { $gt: new Date(start.getTime() - margin) },
    };
    if (roomTypeId) {
      const typeId = this.toObjectId(roomTypeId, 'room_type_id');
      filter.$or = [
        { room_type_id: null },
        { room_type_id: typeId },
        { 'preferences.alternative_room_type_ids': typeId },
      ];
    }

    const candidates = (await this.waitlistModel
      .find(filter)
      .sort({ priority: -1, created_at: 1 })
      .lean()
      .exec()) as unknown as Waitlist[];

    return candidates.filter((entry) =>
      this.fitsAvailability(entry, start, end),
    );
  }

  /**
   * Notifie les clients compatibles lorsqu'une chambre se libère
   * (`notifyAvailable`). Chaque client notifié dispose de 4 h pour confirmer.
   */
  async notifyAvailable(
    propertyId: string,
    dto: NotifyAvailabilityDto,
    now: Date = new Date(),
  ): Promise<Waitlist[]> {
    const matches = await this.findMatchingEntries(
      propertyId,
      dto.start_date,
      dto.end_date,
      dto.room_type_id,
    );
    const selected = matches.slice(0, dto.limit ?? 1);
    const deadline = new Date(
      now.getTime() + WAITLIST_CONFIRMATION_DELAY_HOURS * 60 * 60 * 1000,
    );

    const notified: Waitlist[] = [];
    for (const entry of selected) {
      // Mise à jour conditionnelle : évite de notifier deux fois en concurrence.
      const updated = await this.waitlistModel
        .findOneAndUpdate(
          { _id: entry._id, status: WaitlistStatus.WAITING },
          {
            $set: {
              status: WaitlistStatus.NOTIFIED,
              notified_at: now,
              confirmation_deadline: deadline,
            },
            $inc: { notification_count: 1 },
          },
          { new: true },
        )
        .exec();
      if (updated) {
        notified.push(updated as unknown as Waitlist);
        this.logger.log(
          `Client ${String(entry.guest_id)} notifié (entrée ${String(entry._id)}, ` +
            `canal ${entry.notification_channel}) – confirmation avant ${deadline.toISOString()}`,
        );
      }
    }
    return notified;
  }

  /**
   * Confirmation par le client après notification.
   * Lève 400 si l'entrée n'a pas été notifiée ou si le délai de 4 h est
   * dépassé (l'entrée passe alors en `expired`).
   */
  async confirm(id: string, now: Date = new Date()): Promise<Waitlist> {
    const entry = await this.findOne(id);
    if (entry.status !== WaitlistStatus.NOTIFIED) {
      throw new BadRequestException(
        `Seule une entrée notifiée peut être confirmée (statut: ${entry.status})`,
      );
    }
    if (entry.confirmation_deadline && entry.confirmation_deadline < now) {
      await super.update(id, {
        status: WaitlistStatus.EXPIRED,
      } as unknown as UpdateWaitlistDto);
      throw new BadRequestException(
        `Délai de confirmation de ${WAITLIST_CONFIRMATION_DELAY_HOURS} h dépassé`,
      );
    }
    return super.update(id, {
      status: WaitlistStatus.CONFIRMED,
      confirmed_at: now,
    } as unknown as UpdateWaitlistDto);
  }

  /** Rattache l'entrée à la réservation créée (statut `converted`). */
  async convertToReservation(
    id: string,
    reservationId: string,
  ): Promise<Waitlist> {
    const entry = await this.findOne(id);
    if (
      ![WaitlistStatus.NOTIFIED, WaitlistStatus.CONFIRMED].includes(
        entry.status,
      )
    ) {
      throw new BadRequestException(
        `L’entrée ne peut pas être convertie (statut: ${entry.status})`,
      );
    }
    return super.update(id, {
      status: WaitlistStatus.CONVERTED,
      reservation_id: this.toObjectId(reservationId, 'reservation_id'),
    } as unknown as UpdateWaitlistDto);
  }

  /** Retire un client de la liste d'attente (annulation). */
  async cancel(id: string, reason?: string): Promise<Waitlist> {
    const entry = await this.findOne(id);
    if (
      [
        WaitlistStatus.CONVERTED,
        WaitlistStatus.CANCELLED,
        WaitlistStatus.EXPIRED,
      ].includes(entry.status)
    ) {
      throw new BadRequestException(
        `L’entrée est déjà clôturée (statut: ${entry.status})`,
      );
    }
    return super.update(id, {
      status: WaitlistStatus.CANCELLED,
      cancellation_reason: reason,
    } as unknown as UpdateWaitlistDto);
  }

  /**
   * Expire les entrées notifiées dont le délai de confirmation est dépassé.
   * Destinée à être appelée périodiquement (tâche planifiée).
   */
  async expireOverdue(now: Date = new Date()): Promise<{ expired: number }> {
    const result = await this.waitlistModel
      .updateMany(
        {
          status: WaitlistStatus.NOTIFIED,
          confirmation_deadline: { $lt: now },
          is_deleted: { $ne: true },
        },
        { $set: { status: WaitlistStatus.EXPIRED } },
      )
      .exec();
    return { expired: result.modifiedCount };
  }

  /** Statistiques de la liste d'attente d'une propriété. */
  async getStatistics(propertyId: string): Promise<WaitlistStatistics> {
    const rows = await this.waitlistModel
      .aggregate<{ _id: WaitlistStatus; count: number }>([
        {
          $match: {
            property_id: this.toObjectId(propertyId, 'property_id'),
            is_deleted: { $ne: true },
          },
        },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ])
      .exec();

    const byStatus = Object.values(WaitlistStatus).reduce(
      (acc, status) => ({ ...acc, [status]: 0 }),
      {} as Record<WaitlistStatus, number>,
    );
    for (const row of rows) {
      byStatus[row._id] = row.count;
    }
    const total = rows.reduce((sum, row) => sum + row.count, 0);
    const rate = (value: number) =>
      total === 0 ? 0 : Math.round((value / total) * 10000) / 100;

    return {
      total,
      current_size:
        byStatus[WaitlistStatus.WAITING] + byStatus[WaitlistStatus.NOTIFIED],
      by_status: byStatus,
      conversion_rate: rate(byStatus[WaitlistStatus.CONVERTED]),
      expiration_rate: rate(byStatus[WaitlistStatus.EXPIRED]),
    };
  }

  /** File d'attente : priorité décroissante puis ancienneté. */
  protected getDefaultSort(): string {
    return '-priority created_at';
  }

  /** Priorité = bonus de fidélité + bonus manuel. */
  private computePriority(tier: LoyaltyTier, boost = 0): number {
    return (WAITLIST_LOYALTY_PRIORITY[tier] ?? 0) + Math.max(0, boost);
  }

  /**
   * Vrai s'il existe un décalage `s` (|s| ≤ flexibilité, en jours) tel que
   * le séjour décalé tienne entièrement dans la disponibilité [start, end].
   */
  private fitsAvailability(entry: Waitlist, start: Date, end: Date): boolean {
    const flex = (entry.preferences?.date_flexibility_days ?? 0) * DAY_MS;
    const minShift = start.getTime() - new Date(entry.check_in).getTime();
    const maxShift = end.getTime() - new Date(entry.check_out).getTime();
    return Math.max(minShift, -flex) <= Math.min(maxShift, flex);
  }

  /** Valide un séjour : dates valides et départ strictement après l'arrivée. */
  private parseStay(
    checkInValue: string | Date,
    checkOutValue: string | Date,
  ): { checkIn: Date; checkOut: Date } {
    const checkIn = new Date(checkInValue);
    const checkOut = new Date(checkOutValue);
    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
      throw new BadRequestException('Date invalide');
    }
    if (checkOut <= checkIn) {
      throw new BadRequestException(
        'La date de fin doit être postérieure à la date de début',
      );
    }
    return { checkIn, checkOut };
  }

  private assertNotInPast(checkIn: Date): void {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    if (checkIn < today) {
      throw new BadRequestException(
        'La date d’arrivée ne peut pas être dans le passé',
      );
    }
  }

  private toObjectId(id: string, field: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Identifiant invalide (${field})`);
    }
    return new Types.ObjectId(id);
  }
}
