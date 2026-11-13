import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseCrudService } from '../../common/services/base-crud.service';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { BookingChannel } from '../../base-entities/enums/booking-channel.enum';
import {
  CancellationPolicyType,
  RatePlan,
  RatePlanDocument,
} from '../schemas/rate-plan.entity';
import { CreateRatePlanDto } from '../dto/create-rate-plan.dto';
import { UpdateRatePlanDto } from '../dto/update-rate-plan.dto';
import { ApplicableRatePlansQueryDto } from '../dto/rate-plan-query.dto';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Contexte d'un séjour pour tester l'applicabilité d'un plan tarifaire. */
export interface StayContext {
  checkIn: Date;
  checkOut: Date;
  bookingDate: Date;
  roomTypeId?: string;
  channel?: BookingChannel;
}

export interface CancellationFeeResult {
  policy_type: CancellationPolicyType;
  total_amount: number;
  fee: number;
  refund_amount: number;
  is_free_cancellation: boolean;
  hours_before_arrival: number;
}

/** Champs soumis aux règles de cohérence d'un plan tarifaire. */
type RatePlanConstraints = Pick<
  CreateRatePlanDto,
  | 'min_stay'
  | 'max_stay'
  | 'min_advance_days'
  | 'max_advance_days'
  | 'valid_from'
  | 'valid_to'
>;

/**
 * Service de gestion des plans tarifaires.
 *
 * Gère le CRUD, l'activation, la recherche des plans applicables à un
 * séjour (validité, durée min/max, anticipation, jour d'arrivée, canal,
 * type de chambre) et le calcul des frais d'annulation.
 */
@Injectable()
export class RatePlanService extends BaseCrudService<
  RatePlan,
  CreateRatePlanDto,
  UpdateRatePlanDto
> {
  constructor(
    @InjectModel(RatePlan.name)
    protected readonly ratePlanModel: Model<RatePlanDocument>,
  ) {
    super(ratePlanModel, RatePlan.name);
  }

  /** Crée un plan tarifaire (code unique par propriété). */
  async create(dto: CreateRatePlanDto): Promise<RatePlan> {
    this.validateConstraints(dto);
    const code = dto.code.trim().toUpperCase();
    await this.assertCodeAvailable(dto.property_id, code);

    return super.create({
      ...dto,
      code,
      cancellation_policy: this.normalizePolicy(dto.cancellation_policy),
    } as unknown as CreateRatePlanDto);
  }

  /** Met à jour un plan en revalidant la cohérence des contraintes fusionnées. */
  async update(id: string, dto: UpdateRatePlanDto): Promise<RatePlan> {
    const existing = await this.findOne(id);
    this.validateConstraints({
      min_stay: dto.min_stay ?? existing.min_stay,
      max_stay: dto.max_stay ?? existing.max_stay,
      min_advance_days: dto.min_advance_days ?? existing.min_advance_days,
      max_advance_days: dto.max_advance_days ?? existing.max_advance_days,
      valid_from: dto.valid_from ?? existing.valid_from?.toISOString(),
      valid_to: dto.valid_to ?? existing.valid_to?.toISOString(),
    });

    const data: Record<string, unknown> = { ...dto };
    if (dto.code) {
      const code = dto.code.trim().toUpperCase();
      if (code !== existing.code) {
        await this.assertCodeAvailable(
          existing.property_id.toString(),
          code,
          id,
        );
      }
      data.code = code;
    }
    if (dto.cancellation_policy) {
      data.cancellation_policy = this.normalizePolicy(dto.cancellation_policy);
    }

    return super.update(id, data as UpdateRatePlanDto);
  }

  /** Liste paginée des plans d'une propriété (`findAllRatePlans`). */
  findByProperty(
    propertyId: string,
    query: PaginationQueryDto,
    activeOnly = false,
  ) {
    const filter: Record<string, unknown> = {
      property_id: this.toObjectId(propertyId, 'property_id'),
    };
    if (activeOnly) {
      filter.is_active = true;
    }
    return this.findAll(query, filter);
  }

  /** Active un plan tarifaire. */
  async activate(id: string): Promise<RatePlan> {
    return super.update(id, { is_active: true } as UpdateRatePlanDto);
  }

  /** Désactive un plan tarifaire (il n'est plus proposé à la vente). */
  async deactivate(id: string): Promise<RatePlan> {
    return super.update(id, { is_active: false } as UpdateRatePlanDto);
  }

  /**
   * Plans actifs applicables à un séjour, triés du moins cher au plus cher
   * (le premier est le « meilleur tarif disponible »).
   */
  async findApplicable(
    propertyId: string,
    query: ApplicableRatePlansQueryDto,
    bookingDate: Date = new Date(),
  ): Promise<RatePlan[]> {
    const checkIn = this.parseDate(query.check_in, 'check_in');
    const checkOut = this.parseDate(query.check_out, 'check_out');
    if (checkOut <= checkIn) {
      throw new BadRequestException(
        'La date de départ doit être postérieure à la date d’arrivée',
      );
    }

    const filter: Record<string, unknown> = {
      property_id: this.toObjectId(propertyId, 'property_id'),
      is_active: true,
      is_deleted: { $ne: true },
    };
    if (query.room_type_id) {
      filter.$or = [
        { room_type_ids: { $size: 0 } },
        { room_type_ids: this.toObjectId(query.room_type_id, 'room_type_id') },
      ];
    }

    const plans = (await this.ratePlanModel
      .find(filter)
      .sort({ 'base_price.amount': 1 })
      .lean()
      .exec()) as unknown as RatePlan[];

    const context: StayContext = {
      checkIn,
      checkOut,
      bookingDate,
      roomTypeId: query.room_type_id,
      channel: query.channel,
    };
    return plans.filter((plan) => this.isApplicable(plan, context));
  }

  /**
   * Vérifie (sans accès base) qu'un plan s'applique à un séjour :
   * actif, validité couvrant toutes les nuits, durée min/max, anticipation
   * min/max, jour d'arrivée, canal et type de chambre.
   */
  isApplicable(plan: RatePlan, context: StayContext): boolean {
    if (!plan.is_active) {
      return false;
    }

    const nights = Math.round(
      (this.startOfDay(context.checkOut).getTime() -
        this.startOfDay(context.checkIn).getTime()) /
        DAY_MS,
    );
    if (nights < (plan.min_stay ?? 1)) {
      return false;
    }
    if (plan.max_stay && nights > plan.max_stay) {
      return false;
    }

    const lastNight = new Date(context.checkOut.getTime() - DAY_MS);
    if (
      plan.valid_from &&
      this.startOfDay(context.checkIn) < this.startOfDay(plan.valid_from)
    ) {
      return false;
    }
    if (
      plan.valid_to &&
      this.startOfDay(lastNight) > this.startOfDay(plan.valid_to)
    ) {
      return false;
    }

    const advanceDays = Math.floor(
      (this.startOfDay(context.checkIn).getTime() -
        this.startOfDay(context.bookingDate).getTime()) /
        DAY_MS,
    );
    if (plan.min_advance_days != null && advanceDays < plan.min_advance_days) {
      return false;
    }
    if (plan.max_advance_days != null && advanceDays > plan.max_advance_days) {
      return false;
    }

    if (
      plan.arrival_days?.length &&
      !plan.arrival_days.includes(context.checkIn.getUTCDay())
    ) {
      return false;
    }

    if (
      context.channel &&
      plan.channels?.length &&
      !plan.channels.includes(context.channel)
    ) {
      return false;
    }

    if (
      context.roomTypeId &&
      plan.room_type_ids?.length &&
      !plan.room_type_ids.some((id) => id.toString() === context.roomTypeId)
    ) {
      return false;
    }

    return true;
  }

  /**
   * Calcule les frais d'annulation selon la politique du plan :
   *  - non remboursable : 100 % retenu ;
   *  - sinon gratuit jusqu'à `free_cancellation_hours` avant l'arrivée,
   *    puis `penalty_percent` % du montant total.
   */
  async calculateCancellationFee(
    id: string,
    totalAmount: number,
    checkInValue: string | Date,
    cancelledAtValue: string | Date = new Date(),
  ): Promise<CancellationFeeResult> {
    if (totalAmount < 0) {
      throw new BadRequestException('Le montant total doit être positif');
    }
    const plan = await this.findOne(id);
    const checkIn = this.parseDate(checkInValue, 'check_in');
    const cancelledAt = this.parseDate(cancelledAtValue, 'cancelled_at');
    const policy = this.normalizePolicy(plan.cancellation_policy);
    const hoursBefore = (checkIn.getTime() - cancelledAt.getTime()) / 3_600_000;

    let fee: number;
    if (policy.type === CancellationPolicyType.NON_REFUNDABLE) {
      fee = totalAmount;
    } else if (hoursBefore >= policy.free_cancellation_hours) {
      fee = 0;
    } else {
      fee = (totalAmount * policy.penalty_percent) / 100;
    }
    fee = Math.round(fee * 100) / 100;

    return {
      policy_type: policy.type,
      total_amount: totalAmount,
      fee,
      refund_amount: Math.round((totalAmount - fee) * 100) / 100,
      is_free_cancellation: fee === 0,
      hours_before_arrival: Math.round(hoursBefore * 100) / 100,
    };
  }

  /** Lève 400 si les contraintes du plan sont incohérentes. */
  private validateConstraints(dto: RatePlanConstraints): void {
    const minStay = dto.min_stay ?? 1;
    if (dto.max_stay != null && dto.max_stay < minStay) {
      throw new BadRequestException(
        'La durée maximale de séjour doit être ≥ à la durée minimale',
      );
    }
    if (
      dto.min_advance_days != null &&
      dto.max_advance_days != null &&
      dto.max_advance_days < dto.min_advance_days
    ) {
      throw new BadRequestException(
        'L’anticipation maximale doit être ≥ à l’anticipation minimale',
      );
    }
    if (dto.valid_from && dto.valid_to) {
      const from = this.parseDate(dto.valid_from, 'valid_from');
      const to = this.parseDate(dto.valid_to, 'valid_to');
      if (to < from) {
        throw new BadRequestException(
          'La fin de validité doit être postérieure au début de validité',
        );
      }
    }
  }

  /** Complète la politique d'annulation avec des valeurs cohérentes. */
  private normalizePolicy(policy?: {
    type?: CancellationPolicyType;
    free_cancellation_hours?: number;
    penalty_percent?: number;
    description?: string;
  }) {
    const type = policy?.type ?? CancellationPolicyType.FLEXIBLE;
    if (type === CancellationPolicyType.NON_REFUNDABLE) {
      return {
        ...policy,
        type,
        free_cancellation_hours: 0,
        penalty_percent: 100,
      };
    }
    return {
      ...policy,
      type,
      free_cancellation_hours: policy?.free_cancellation_hours ?? 24,
      penalty_percent: policy?.penalty_percent ?? 100,
    };
  }

  private async assertCodeAvailable(
    propertyId: string,
    code: string,
    excludeId?: string,
  ): Promise<void> {
    const filter: Record<string, unknown> = {
      property_id: this.toObjectId(propertyId, 'property_id'),
      code,
    };
    if (excludeId) {
      filter._id = { $ne: this.toObjectId(excludeId, 'id') };
    }
    if (await this.repository.exists(filter)) {
      throw new ConflictException(
        `Un plan tarifaire avec le code ${code} existe déjà`,
      );
    }
  }

  private startOfDay(value: Date): Date {
    const date = new Date(value);
    date.setUTCHours(0, 0, 0, 0);
    return date;
  }

  private parseDate(value: string | Date, field: string): Date {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      throw new BadRequestException(`Date invalide (${field})`);
    }
    return date;
  }

  private toObjectId(id: string, field: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Identifiant invalide (${field})`);
    }
    return new Types.ObjectId(id);
  }
}
