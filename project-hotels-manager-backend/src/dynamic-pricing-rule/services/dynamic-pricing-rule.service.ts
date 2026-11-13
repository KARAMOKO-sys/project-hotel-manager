import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseCrudService } from '../../common/services/base-crud.service';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import {
  DynamicPricingRule,
  DynamicPricingRuleDocument,
  MAX_ADJUSTMENT_PERCENT,
  MIN_ADJUSTMENT_PERCENT,
  PricingRuleType,
  VALIDATION_THRESHOLD_PERCENT,
} from '../schemas/dynamic-pricing-rule.entity';
import { CreateDynamicPricingRuleDto } from '../dto/create-dynamic-pricing-rule.dto';
import { UpdateDynamicPricingRuleDto } from '../dto/update-dynamic-pricing-rule.dto';
import { CalculateAdjustedPriceDto } from '../dto/pricing-context.dto';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Contexte d'évaluation des règles pour une nuit donnée. */
export interface PricingContext {
  /** Nuit à tarifer. */
  date: Date;
  /** Date de la réservation (défaut : maintenant). */
  bookingDate?: Date;
  /** Taux d'occupation prévu de la nuit, en %. */
  occupancyRate?: number;
  roomTypeId?: string;
}

export interface AppliedRule {
  rule_id: string;
  name: string;
  rule_type: PricingRuleType;
  adjustment_percent: number;
}

export interface PricingResult {
  base_price: number;
  adjusted_price: number;
  /** Somme brute des ajustements des règles appliquées. */
  raw_adjustment_percent: number;
  /** Ajustement effectivement appliqué, borné à [-20 %, +50 %]. */
  total_adjustment_percent: number;
  was_clamped: boolean;
  /** Vrai si la variation finale dépasse 25 % (validation requise). */
  requires_validation: boolean;
  applied_rules: AppliedRule[];
}

/** Champs nécessaires à la validation de la définition d'une règle. */
type RuleDefinition = Pick<
  CreateDynamicPricingRuleDto,
  | 'rule_type'
  | 'adjustment_percent'
  | 'start_date'
  | 'end_date'
  | 'days_before_arrival'
  | 'occupancy_threshold'
>;

/**
 * Service de tarification dynamique.
 *
 * Gère les règles (saisonnalité, événement, dernière minute, seuil
 * d'occupation) et calcule le prix ajusté via `applyRules`, calcul pur :
 * les ajustements des règles applicables sont additionnés puis bornés à
 * [-20 %, +50 %]. Toute variation > 25 % requiert une validation.
 */
@Injectable()
export class DynamicPricingRuleService extends BaseCrudService<
  DynamicPricingRule,
  CreateDynamicPricingRuleDto,
  UpdateDynamicPricingRuleDto
> {
  constructor(
    @InjectModel(DynamicPricingRule.name)
    protected readonly ruleModel: Model<DynamicPricingRuleDocument>,
  ) {
    super(ruleModel, DynamicPricingRule.name);
  }

  /**
   * Crée une règle (`createRule`). Une règle dont la variation dépasse 25 %
   * est créée inactive et doit être validée avant activation.
   */
  async create(dto: CreateDynamicPricingRuleDto): Promise<DynamicPricingRule> {
    this.validateDefinition(dto);
    const requiresValidation = this.needsValidation(dto.adjustment_percent);

    return super.create({
      ...dto,
      requires_validation: requiresValidation,
      is_active: requiresValidation ? false : (dto.is_active ?? true),
    } as unknown as CreateDynamicPricingRuleDto);
  }

  /**
   * Met à jour une règle. Si l'ajustement change et dépasse 25 %, la
   * validation précédente est annulée et la règle est désactivée.
   */
  async update(
    id: string,
    dto: UpdateDynamicPricingRuleDto,
  ): Promise<DynamicPricingRule> {
    const existing = await this.findOne(id);
    const merged: RuleDefinition = {
      rule_type: dto.rule_type ?? existing.rule_type,
      adjustment_percent: dto.adjustment_percent ?? existing.adjustment_percent,
      start_date: dto.start_date ?? existing.start_date?.toISOString(),
      end_date: dto.end_date ?? existing.end_date?.toISOString(),
      days_before_arrival:
        dto.days_before_arrival ?? existing.days_before_arrival,
      occupancy_threshold:
        dto.occupancy_threshold ?? existing.occupancy_threshold,
    };
    this.validateDefinition(merged);

    const data: Record<string, unknown> = { ...dto };
    const requiresValidation = this.needsValidation(merged.adjustment_percent);
    let validated = this.isValidated(existing);

    if (
      dto.adjustment_percent !== undefined &&
      dto.adjustment_percent !== existing.adjustment_percent
    ) {
      data.requires_validation = requiresValidation;
      if (requiresValidation) {
        data.validated_at = null;
        data.validated_by = null;
        data.is_active = false;
        validated = false;
      }
    }

    if (dto.is_active === true && requiresValidation && !validated) {
      throw new BadRequestException(
        `Une variation de plus de ${VALIDATION_THRESHOLD_PERCENT} % doit être validée avant activation`,
      );
    }

    return super.update(id, data as UpdateDynamicPricingRuleDto);
  }

  /** Valide une règle à forte variation (> 25 %). */
  async validateRule(
    id: string,
    validatedBy?: string,
  ): Promise<DynamicPricingRule> {
    const rule = await this.findOne(id);
    if (!rule.requires_validation) {
      throw new BadRequestException(
        'Cette règle ne requiert pas de validation',
      );
    }
    return super.update(id, {
      validated_at: new Date(),
      validated_by: validatedBy
        ? this.toObjectId(validatedBy, 'validated_by')
        : undefined,
    } as unknown as UpdateDynamicPricingRuleDto);
  }

  /** Active une règle (refusé si elle attend encore sa validation). */
  async activate(id: string): Promise<DynamicPricingRule> {
    const rule = await this.findOne(id);
    if (!this.isValidated(rule)) {
      throw new BadRequestException(
        `Une variation de plus de ${VALIDATION_THRESHOLD_PERCENT} % doit être validée avant activation`,
      );
    }
    return super.update(id, { is_active: true } as UpdateDynamicPricingRuleDto);
  }

  /** Désactive une règle. */
  async deactivate(id: string): Promise<DynamicPricingRule> {
    return super.update(id, {
      is_active: false,
    } as UpdateDynamicPricingRuleDto);
  }

  /** Liste paginée des règles d'une propriété (`findAllRules`). */
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

  /** Règles actives d'une propriété, éventuellement pour un type de chambre. */
  async findActiveRules(
    propertyId: string,
    roomTypeId?: string,
  ): Promise<DynamicPricingRule[]> {
    const filter: Record<string, unknown> = {
      property_id: this.toObjectId(propertyId, 'property_id'),
      is_active: true,
      is_deleted: { $ne: true },
    };
    if (roomTypeId) {
      filter.$or = [
        { room_type_ids: { $size: 0 } },
        { room_type_ids: this.toObjectId(roomTypeId, 'room_type_id') },
      ];
    }
    return this.ruleModel
      .find(filter)
      .sort({ priority: -1 })
      .lean()
      .exec() as unknown as Promise<DynamicPricingRule[]>;
  }

  /**
   * Calcule le prix ajusté d'une nuit à partir des règles actives de la
   * propriété (`calculateAdjustedPrice`).
   */
  async calculateAdjustedPrice(
    propertyId: string,
    dto: CalculateAdjustedPriceDto,
  ): Promise<PricingResult> {
    const context: PricingContext = {
      date: this.parseDate(dto.date, 'date'),
      bookingDate: dto.booking_date
        ? this.parseDate(dto.booking_date, 'booking_date')
        : undefined,
      occupancyRate: dto.occupancy_rate,
      roomTypeId: dto.room_type_id,
    };
    const rules = await this.findActiveRules(propertyId, dto.room_type_id);
    return this.applyRules(dto.base_price, context, rules);
  }

  /**
   * Calcul pur (sans accès base) du prix ajusté.
   *
   * Seules les règles actives, validées si nécessaire, et dont les conditions
   * sont réunies sont retenues. Leurs ajustements sont additionnés puis bornés
   * à [-20 %, +50 %].
   */
  applyRules(
    basePrice: number,
    context: PricingContext,
    rules: DynamicPricingRule[],
  ): PricingResult {
    if (!Number.isFinite(basePrice) || basePrice < 0) {
      throw new BadRequestException('Le prix de base doit être positif');
    }

    const applied = [...rules]
      .filter(
        (rule) =>
          rule.is_active &&
          this.isValidated(rule) &&
          this.ruleMatches(rule, context),
      )
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

    const raw = this.round(
      applied.reduce((sum, rule) => sum + rule.adjustment_percent, 0),
    );
    const total = Math.min(
      MAX_ADJUSTMENT_PERCENT,
      Math.max(MIN_ADJUSTMENT_PERCENT, raw),
    );

    return {
      base_price: basePrice,
      adjusted_price: this.round(basePrice * (1 + total / 100)),
      raw_adjustment_percent: raw,
      total_adjustment_percent: total,
      was_clamped: total !== raw,
      requires_validation: this.needsValidation(total),
      applied_rules: applied.map((rule) => ({
        rule_id: String(rule._id),
        name: rule.name,
        rule_type: rule.rule_type,
        adjustment_percent: rule.adjustment_percent,
      })),
    };
  }

  /** Indique si les conditions d'une règle sont réunies pour le contexte. */
  ruleMatches(rule: DynamicPricingRule, context: PricingContext): boolean {
    const night = this.startOfDay(context.date);

    if (
      context.roomTypeId &&
      rule.room_type_ids?.length &&
      !rule.room_type_ids.some((id) => id.toString() === context.roomTypeId)
    ) {
      return false;
    }

    if (
      rule.days_of_week?.length &&
      !rule.days_of_week.includes(night.getUTCDay())
    ) {
      return false;
    }

    switch (rule.rule_type) {
      case PricingRuleType.SEASONALITY:
      case PricingRuleType.EVENT:
        return (
          !!rule.start_date &&
          !!rule.end_date &&
          night >= this.startOfDay(rule.start_date) &&
          night <= this.startOfDay(rule.end_date)
        );
      case PricingRuleType.LAST_MINUTE: {
        if (rule.days_before_arrival == null) {
          return false;
        }
        const booking = this.startOfDay(context.bookingDate ?? new Date());
        const leadDays = Math.round(
          (night.getTime() - booking.getTime()) / DAY_MS,
        );
        return leadDays >= 0 && leadDays <= rule.days_before_arrival;
      }
      case PricingRuleType.OCCUPANCY_THRESHOLD:
        return (
          rule.occupancy_threshold != null &&
          context.occupancyRate != null &&
          context.occupancyRate >= rule.occupancy_threshold
        );
      default:
        return false;
    }
  }

  /** Lève 400 si la définition de la règle est incomplète ou incohérente. */
  private validateDefinition(rule: RuleDefinition): void {
    if (
      rule.adjustment_percent < MIN_ADJUSTMENT_PERCENT ||
      rule.adjustment_percent > MAX_ADJUSTMENT_PERCENT
    ) {
      throw new BadRequestException(
        `L’ajustement doit être compris entre ${MIN_ADJUSTMENT_PERCENT} % et +${MAX_ADJUSTMENT_PERCENT} %`,
      );
    }

    switch (rule.rule_type) {
      case PricingRuleType.SEASONALITY:
      case PricingRuleType.EVENT: {
        if (!rule.start_date || !rule.end_date) {
          throw new BadRequestException(
            'Une règle de saisonnalité / d’événement requiert start_date et end_date',
          );
        }
        const start = this.parseDate(rule.start_date, 'start_date');
        const end = this.parseDate(rule.end_date, 'end_date');
        if (end < start) {
          throw new BadRequestException(
            'La date de fin doit être postérieure ou égale à la date de début',
          );
        }
        break;
      }
      case PricingRuleType.LAST_MINUTE:
        if (rule.days_before_arrival == null) {
          throw new BadRequestException(
            'Une règle de dernière minute requiert days_before_arrival',
          );
        }
        break;
      case PricingRuleType.OCCUPANCY_THRESHOLD:
        if (rule.occupancy_threshold == null) {
          throw new BadRequestException(
            'Une règle d’occupation requiert occupancy_threshold',
          );
        }
        break;
    }
  }

  private needsValidation(adjustmentPercent: number): boolean {
    return Math.abs(adjustmentPercent) > VALIDATION_THRESHOLD_PERCENT;
  }

  private isValidated(rule: DynamicPricingRule): boolean {
    return !rule.requires_validation || !!rule.validated_at;
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
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
