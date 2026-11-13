import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types, SchemaTypes } from 'mongoose';
import { AuditableEntity } from '../../base-entities/embeddables/auditable.entity';
import {
  MoneyEmbeddable,
  MoneySchema,
} from '../../base-entities/embeddables/money.embeddable';
import { BookingChannel } from '../../base-entities/enums/booking-channel.enum';

export type RatePlanDocument = HydratedDocument<RatePlan>;

/** Formule de restauration incluse dans le tarif. */
export enum MealPlan {
  ROOM_ONLY = 'room_only',
  BREAKFAST = 'breakfast',
  HALF_BOARD = 'half_board',
  FULL_BOARD = 'full_board',
  ALL_INCLUSIVE = 'all_inclusive',
}

/** Type de politique d'annulation. */
export enum CancellationPolicyType {
  FLEXIBLE = 'flexible',
  MODERATE = 'moderate',
  STRICT = 'strict',
  NON_REFUNDABLE = 'non_refundable',
}

/**
 * Politique d'annulation : annulation gratuite jusqu'à
 * `free_cancellation_hours` avant l'arrivée, puis pénalité de
 * `penalty_percent` % du montant total. `non_refundable` = 100 % retenu.
 */
@Schema({ _id: false })
export class CancellationPolicy {
  @Prop({
    type: String,
    enum: Object.values(CancellationPolicyType),
    default: CancellationPolicyType.FLEXIBLE,
  })
  type!: CancellationPolicyType;

  @Prop({ type: Number, min: 0, default: 24 })
  free_cancellation_hours!: number;

  @Prop({ type: Number, min: 0, max: 100, default: 100 })
  penalty_percent!: number;

  @Prop({ type: String, maxlength: 1000 })
  description?: string;
}

export const CancellationPolicySchema =
  SchemaFactory.createForClass(CancellationPolicy);

/**
 * Plan tarifaire (ex. « Non remboursable », « Petit-déjeuner inclus »).
 *
 * Définit un prix de base par nuit, des conditions de séjour (durée min/max,
 * anticipation, jours d'arrivée), une politique d'annulation et une période
 * de validité.
 */
@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'rate_plans',
})
export class RatePlan extends AuditableEntity {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Property', required: true, index: true })
  property_id!: Types.ObjectId;

  /** Types de chambre concernés (vide = tous les types de la propriété). */
  @Prop({ type: [{ type: SchemaTypes.ObjectId, ref: 'RoomType' }], default: [] })
  room_type_ids!: Types.ObjectId[];

  @Prop({ type: String, required: true, trim: true, maxlength: 100 })
  name!: string;

  @Prop({
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    maxlength: 50,
  })
  code!: string;

  @Prop({ type: String, maxlength: 1000 })
  description?: string;

  /** Prix de base par nuit. */
  @Prop({
    type: MoneySchema,
    required: true,
    default: () => ({ amount: 0, currency: 'XOF' }),
  })
  base_price!: MoneyEmbeddable;

  @Prop({
    type: String,
    enum: Object.values(MealPlan),
    default: MealPlan.ROOM_ONLY,
  })
  meal_plan!: MealPlan;

  @Prop({ type: CancellationPolicySchema, default: () => ({}) })
  cancellation_policy!: CancellationPolicy;

  @Prop({ type: Number, min: 1, default: 1 })
  min_stay!: number;

  @Prop({ type: Number, min: 1 })
  max_stay?: number;

  /** Réservation au moins X jours avant l'arrivée (early booking). */
  @Prop({ type: Number, min: 0 })
  min_advance_days?: number;

  /** Réservation au plus X jours avant l'arrivée (last minute). */
  @Prop({ type: Number, min: 0 })
  max_advance_days?: number;

  /** Jours d'arrivée autorisés (0 = dimanche … 6 = samedi). Vide = tous. */
  @Prop({ type: [Number], default: [] })
  arrival_days!: number[];

  /** Canaux de vente autorisés. Vide = tous. */
  @Prop({
    type: [String],
    enum: Object.values(BookingChannel),
    default: [],
  })
  channels!: BookingChannel[];

  /** Conditions particulières affichées au client. */
  @Prop({ type: String, maxlength: 2000 })
  conditions?: string;

  @Prop({ type: Date })
  valid_from?: Date;

  @Prop({ type: Date })
  valid_to?: Date;

  @Prop({ type: Boolean, default: true, index: true })
  is_active!: boolean;
}

export const RatePlanSchema = SchemaFactory.createForClass(RatePlan);

RatePlanSchema.index({ property_id: 1, code: 1 }, { unique: true });
RatePlanSchema.index({ property_id: 1, is_active: 1 });
RatePlanSchema.index({ valid_from: 1, valid_to: 1 });
