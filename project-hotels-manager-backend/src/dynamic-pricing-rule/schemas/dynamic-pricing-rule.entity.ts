import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types, SchemaTypes } from 'mongoose';
import { AuditableEntity } from '../../base-entities/embeddables/auditable.entity';

export type DynamicPricingRuleDocument = HydratedDocument<DynamicPricingRule>;

/** Type de règle de tarification dynamique. */
export enum PricingRuleType {
  /** Haute / basse saison sur une période. */
  SEASONALITY = 'seasonality',
  /** Événement local (festival, salon…) sur une période. */
  EVENT = 'event',
  /** Réservation de dernière minute (à X jours ou moins de l'arrivée). */
  LAST_MINUTE = 'last_minute',
  /** Taux d'occupation supérieur ou égal à un seuil. */
  OCCUPANCY_THRESHOLD = 'occupancy_threshold',
}

/** Bornes de l'ajustement d'une règle (et du cumul des règles), en %. */
export const MIN_ADJUSTMENT_PERCENT = -20;
export const MAX_ADJUSTMENT_PERCENT = 50;
/** Au-delà de cette variation (en valeur absolue), une validation humaine est requise. */
export const VALIDATION_THRESHOLD_PERCENT = 25;

/**
 * Règle de tarification dynamique : ajuste le prix de base d'un pourcentage
 * (entre -20 % et +50 %) lorsque ses conditions sont réunies.
 *
 * Toute règle dont la variation dépasse 25 % doit être validée
 * (`validated_at`) avant de pouvoir être activée.
 */
@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'dynamic_pricing_rules',
})
export class DynamicPricingRule extends AuditableEntity {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Property', required: true, index: true })
  property_id!: Types.ObjectId;

  /** Types de chambre concernés (vide = tous). */
  @Prop({ type: [{ type: SchemaTypes.ObjectId, ref: 'RoomType' }], default: [] })
  room_type_ids!: Types.ObjectId[];

  @Prop({ type: String, required: true, trim: true, maxlength: 100 })
  name!: string;

  @Prop({ type: String, maxlength: 500 })
  description?: string;

  @Prop({
    type: String,
    enum: Object.values(PricingRuleType),
    required: true,
    index: true,
  })
  rule_type!: PricingRuleType;

  @Prop({
    type: Number,
    required: true,
    min: MIN_ADJUSTMENT_PERCENT,
    max: MAX_ADJUSTMENT_PERCENT,
  })
  adjustment_percent!: number;

  /** Début de période (saisonnalité / événement). */
  @Prop({ type: Date })
  start_date?: Date;

  /** Fin de période incluse (saisonnalité / événement). */
  @Prop({ type: Date })
  end_date?: Date;

  /** Dernière minute : s'applique si l'arrivée est à X jours ou moins. */
  @Prop({ type: Number, min: 0 })
  days_before_arrival?: number;

  /** Occupation : s'applique si le taux d'occupation (%) ≥ seuil. */
  @Prop({ type: Number, min: 0, max: 100 })
  occupancy_threshold?: number;

  /** Jours de la semaine concernés (0 = dimanche … 6 = samedi). Vide = tous. */
  @Prop({ type: [Number], default: [] })
  days_of_week!: number[];

  /** Ordre d'affichage / d'évaluation (plus élevé = évalué en premier). */
  @Prop({ type: Number, default: 0 })
  priority!: number;

  @Prop({ type: Boolean, default: false, index: true })
  is_active!: boolean;

  /** Vrai si |ajustement| > 25 % : validation humaine obligatoire. */
  @Prop({ type: Boolean, default: false })
  requires_validation!: boolean;

  @Prop({ type: Date })
  validated_at?: Date;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' })
  validated_by?: Types.ObjectId;
}

export const DynamicPricingRuleSchema =
  SchemaFactory.createForClass(DynamicPricingRule);

DynamicPricingRuleSchema.index({ property_id: 1, is_active: 1, rule_type: 1 });
DynamicPricingRuleSchema.index({ start_date: 1, end_date: 1 });
