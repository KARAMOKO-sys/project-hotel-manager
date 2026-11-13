import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseCrudService } from '../../common/services/base-crud.service';
import {
  DailyPrice,
  DailyPriceDocument,
  DailyPriceSource,
} from '../schemas/daily-price.entity';
import { CreateDailyPriceDto } from '../dto/create-daily-price.dto';
import { UpdateDailyPriceDto } from '../dto/update-daily-price.dto';
import { BulkSetDailyPriceDto } from '../dto/daily-price-actions.dto';

const DAY_MS = 24 * 60 * 60 * 1000;
/** Plage maximale autorisée pour les opérations en masse / calendrier. */
export const MAX_PRICE_RANGE_DAYS = 366;

export interface PriceCalendarDay {
  date: string;
  price: number | null;
  currency: string | null;
  is_closed: boolean;
  min_stay: number | null;
  source: DailyPriceSource | null;
}

export interface PriceCalendar {
  room_type_id: string;
  rate_plan_id: string | null;
  start_date: string;
  end_date: string;
  days: PriceCalendarDay[];
}

export interface BulkSetResult {
  dates: number;
  upserted: number;
  modified: number;
}

export interface StayPrice {
  room_type_id: string;
  nights: number;
  currency: string;
  total: number;
  average_per_night: number;
  breakdown: { date: string; amount: number }[];
}

/**
 * Service de gestion des prix journaliers (calendrier tarifaire).
 *
 * Permet de fixer un prix pour une nuit, de définir un prix en masse sur une
 * plage de dates, de consulter le calendrier d'un type de chambre et de
 * calculer le prix total d'un séjour à partir des prix journaliers.
 */
@Injectable()
export class DailyPriceService extends BaseCrudService<
  DailyPrice,
  CreateDailyPriceDto,
  UpdateDailyPriceDto
> {
  constructor(
    @InjectModel(DailyPrice.name)
    protected readonly dailyPriceModel: Model<DailyPriceDocument>,
  ) {
    super(dailyPriceModel, DailyPrice.name);
  }

  /** Crée un prix journalier. Lève 409 si un prix existe déjà pour cette nuit. */
  async create(dto: CreateDailyPriceDto): Promise<DailyPrice> {
    const key = this.buildKey(dto.room_type_id, dto.date, dto.rate_plan_id);
    if (await this.repository.exists(key)) {
      throw new ConflictException(
        'Un prix existe déjà pour ce type de chambre à cette date',
      );
    }
    return super.create({
      ...dto,
      ...key,
      property_id: this.toObjectId(dto.property_id, 'property_id'),
    } as unknown as CreateDailyPriceDto);
  }

  /** Fixe (crée ou remplace) le prix d'une nuit (`setDailyPrice`). */
  async setPrice(dto: CreateDailyPriceDto): Promise<DailyPrice> {
    const key = this.buildKey(dto.room_type_id, dto.date, dto.rate_plan_id);
    const doc = await this.dailyPriceModel
      .findOneAndUpdate(
        key,
        {
          $set: {
            property_id: this.toObjectId(dto.property_id, 'property_id'),
            price: dto.price,
            min_stay: dto.min_stay,
            is_closed: dto.is_closed ?? false,
            source: dto.source ?? DailyPriceSource.MANUAL,
            notes: dto.notes,
            is_deleted: false,
          },
        },
        { upsert: true, new: true, runValidators: true },
      )
      .exec();
    return doc as unknown as DailyPrice;
  }

  /**
   * Définit un prix sur toutes les nuits d'une plage (bornes incluses),
   * éventuellement limitée à certains jours de la semaine.
   */
  async bulkSetPrices(dto: BulkSetDailyPriceDto): Promise<BulkSetResult> {
    const dates = this.enumerateDates(dto.start_date, dto.end_date).filter(
      (date) =>
        !dto.days_of_week?.length ||
        dto.days_of_week.includes(date.getUTCDay()),
    );
    if (dates.length === 0) {
      throw new BadRequestException(
        'Aucune date ne correspond aux jours de la semaine demandés',
      );
    }

    const propertyId = this.toObjectId(dto.property_id, 'property_id');
    const roomTypeId = this.toObjectId(dto.room_type_id, 'room_type_id');
    const ratePlanId = dto.rate_plan_id
      ? this.toObjectId(dto.rate_plan_id, 'rate_plan_id')
      : null;

    const operations = dates.map((date) => ({
      updateOne: {
        filter: { room_type_id: roomTypeId, rate_plan_id: ratePlanId, date },
        update: {
          $set: {
            property_id: propertyId,
            price: dto.price,
            min_stay: dto.min_stay,
            is_closed: dto.is_closed ?? false,
            source: dto.source ?? DailyPriceSource.BULK,
            is_deleted: false,
          },
        },
        upsert: true,
      },
    }));

    const result = await this.dailyPriceModel.bulkWrite(
      operations as unknown as Parameters<
        Model<DailyPriceDocument>['bulkWrite']
      >[0],
      { ordered: false },
    );
    return {
      dates: dates.length,
      upserted: result.upsertedCount,
      modified: result.modifiedCount,
    };
  }

  /**
   * Calendrier des prix d'un type de chambre sur une plage (bornes incluses).
   * Les nuits sans prix défini sont retournées avec `price: null`.
   */
  async getCalendar(
    roomTypeId: string,
    startDate: string,
    endDate: string,
    ratePlanId?: string,
  ): Promise<PriceCalendar> {
    const dates = this.enumerateDates(startDate, endDate);
    const prices = await this.findPrices(
      roomTypeId,
      dates[0],
      dates[dates.length - 1],
      ratePlanId,
    );
    const byDate = new Map(
      prices.map((p) => [new Date(p.date).toISOString(), p]),
    );

    return {
      room_type_id: roomTypeId,
      rate_plan_id: ratePlanId ?? null,
      start_date: this.formatDay(dates[0]),
      end_date: this.formatDay(dates[dates.length - 1]),
      days: dates.map((date) => {
        const price = byDate.get(date.toISOString());
        return {
          date: this.formatDay(date),
          price: price?.price?.amount ?? null,
          currency: price?.price?.currency ?? null,
          is_closed: price?.is_closed ?? false,
          min_stay: price?.min_stay ?? null,
          source: price?.source ?? null,
        };
      }),
    };
  }

  /** Prix d'un type de chambre pour une nuit. Lève 404 si non défini. */
  async getPriceForDate(
    roomTypeId: string,
    date: string,
    ratePlanId?: string,
  ): Promise<DailyPrice> {
    const price = await this.repository.findOne({
      ...this.buildKey(roomTypeId, date, ratePlanId),
      is_deleted: { $ne: true },
    });
    if (!price) {
      throw new NotFoundException(
        `Aucun prix défini pour le ${this.formatDay(this.toDay(date, 'date'))}`,
      );
    }
    return price;
  }

  /**
   * Prix total d'un séjour (nuit de départ exclue) à partir des prix
   * journaliers. Lève 400 si une nuit n'a pas de prix, est fermée à la vente,
   * si la durée minimale de séjour n'est pas respectée ou si les devises
   * diffèrent.
   */
  async calculateStayPrice(
    roomTypeId: string,
    checkIn: string,
    checkOut: string,
    ratePlanId?: string,
  ): Promise<StayPrice> {
    const start = this.toDay(checkIn, 'check_in');
    const end = this.toDay(checkOut, 'check_out');
    if (end <= start) {
      throw new BadRequestException(
        'La date de départ doit être postérieure à la date d’arrivée',
      );
    }
    const lastNight = new Date(end.getTime() - DAY_MS);
    const nights = this.enumerateDates(start, lastNight);
    const prices = await this.findPrices(
      roomTypeId,
      start,
      lastNight,
      ratePlanId,
    );
    const byDate = new Map(
      prices.map((p) => [new Date(p.date).toISOString(), p]),
    );

    const missing = nights.filter((d) => !byDate.has(d.toISOString()));
    if (missing.length) {
      throw new BadRequestException(
        `Prix non défini pour : ${missing.map((d) => this.formatDay(d)).join(', ')}`,
      );
    }
    const closed = nights.filter((d) => byDate.get(d.toISOString())!.is_closed);
    if (closed.length) {
      throw new BadRequestException(
        `Vente fermée pour : ${closed.map((d) => this.formatDay(d)).join(', ')}`,
      );
    }
    const arrival = byDate.get(start.toISOString())!;
    if (arrival.min_stay && nights.length < arrival.min_stay) {
      throw new BadRequestException(
        `Durée minimale de séjour de ${arrival.min_stay} nuit(s) pour une arrivée le ${this.formatDay(start)}`,
      );
    }

    const breakdown = nights.map((d) => {
      const p = byDate.get(d.toISOString())!;
      return {
        date: this.formatDay(d),
        amount: p.price.amount,
        currency: p.price.currency,
      };
    });
    const currencies = new Set(breakdown.map((b) => b.currency));
    if (currencies.size > 1) {
      throw new BadRequestException(
        'Les prix du séjour sont exprimés dans des devises différentes',
      );
    }

    const total =
      Math.round(breakdown.reduce((sum, b) => sum + b.amount, 0) * 100) / 100;
    return {
      room_type_id: roomTypeId,
      nights: nights.length,
      currency: String(breakdown[0].currency),
      total,
      average_per_night: Math.round((total / nights.length) * 100) / 100,
      breakdown: breakdown.map(({ date, amount }) => ({ date, amount })),
    };
  }

  /**
   * Suppression physique : un prix journalier n'a pas de valeur d'audit et
   * l'index unique (type, plan, date) doit pouvoir être réutilisé.
   */
  async remove(id: string): Promise<DailyPrice> {
    const doc = await this.repository.hardRemove(id);
    if (!doc) {
      throw new NotFoundException(`${this.entityName} introuvable (id: ${id})`);
    }
    return doc;
  }

  protected getDefaultSort(): string {
    return 'date';
  }

  private findPrices(
    roomTypeId: string,
    from: Date,
    to: Date,
    ratePlanId?: string,
  ): Promise<DailyPrice[]> {
    return this.dailyPriceModel
      .find({
        room_type_id: this.toObjectId(roomTypeId, 'room_type_id'),
        rate_plan_id: ratePlanId
          ? this.toObjectId(ratePlanId, 'rate_plan_id')
          : null,
        date: { $gte: from, $lte: to },
        is_deleted: { $ne: true },
      })
      .sort({ date: 1 })
      .lean()
      .exec() as unknown as Promise<DailyPrice[]>;
  }

  /** Clé d'unicité d'un prix journalier. */
  private buildKey(roomTypeId: string, date: string, ratePlanId?: string) {
    return {
      room_type_id: this.toObjectId(roomTypeId, 'room_type_id'),
      rate_plan_id: ratePlanId
        ? this.toObjectId(ratePlanId, 'rate_plan_id')
        : null,
      date: this.toDay(date, 'date'),
    };
  }

  /** Liste les jours (minuit UTC) d'une plage inclusive, avec contrôles. */
  private enumerateDates(
    startValue: string | Date,
    endValue: string | Date,
  ): Date[] {
    const start = this.toDay(startValue, 'start_date');
    const end = this.toDay(endValue, 'end_date');
    if (end < start) {
      throw new BadRequestException(
        'La date de fin doit être postérieure ou égale à la date de début',
      );
    }
    const count = Math.round((end.getTime() - start.getTime()) / DAY_MS) + 1;
    if (count > MAX_PRICE_RANGE_DAYS) {
      throw new BadRequestException(
        `La plage ne peut pas dépasser ${MAX_PRICE_RANGE_DAYS} jours`,
      );
    }
    return Array.from(
      { length: count },
      (_, i) => new Date(start.getTime() + i * DAY_MS),
    );
  }

  /** Normalise une date à minuit UTC. */
  private toDay(value: string | Date, field: string): Date {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      throw new BadRequestException(`Date invalide (${field})`);
    }
    date.setUTCHours(0, 0, 0, 0);
    return date;
  }

  private formatDay(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private toObjectId(id: string, field: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Identifiant invalide (${field})`);
    }
    return new Types.ObjectId(id);
  }
}
