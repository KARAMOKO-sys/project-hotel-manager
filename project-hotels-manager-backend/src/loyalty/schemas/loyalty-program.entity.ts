import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { AuditableEntity } from '../../base-entities/embeddables/auditable.entity';
import { Currency } from '../../base-entities/enums/currency.enum';
import { LoyaltyTier } from '../../base-entities/enums/loyalty-tier.enum';

export type LoyaltyProgramDocument = HydratedDocument<LoyaltyProgram>;

@Schema({ _id: false })
export class LoyaltyTierRule {
  @Prop({ type: String, enum: Object.values(LoyaltyTier), required: true })
  tier!: LoyaltyTier;

  @Prop({ type: Number, min: 0, required: true })
  min_lifetime_points!: number;

  @Prop({ type: Number, min: 0, default: 1 })
  earn_multiplier!: number;
}
export const LoyaltyTierRuleSchema =
  SchemaFactory.createForClass(LoyaltyTierRule);

/**
 * Programme de fidélité d'un établissement (`property_id`) ou de toute une
 * organisation (`organization_id`). Un seul programme actif par portée
 * (`scope_key` unique parmi les programmes actifs).
 */
@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'loyalty_programs',
})
export class LoyaltyProgram extends AuditableEntity {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Property', index: true })
  property_id?: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Organization', index: true })
  organization_id?: Types.ObjectId;

  /** `property:<id>` ou `organization:<id>` (calculé). */
  @Prop({ type: String, required: true })
  scope_key!: string;

  @Prop({ type: String, required: true, trim: true, maxlength: 150 })
  name!: string;

  @Prop({ type: String, enum: Object.values(Currency), default: Currency.XOF })
  currency!: Currency;

  /** Montant donnant droit à `points_per_unit` points (ex. 1 000 XOF). */
  @Prop({ type: Number, min: 0.01, default: 1000 })
  earn_unit_amount!: number;

  /** Points gagnés par unité (ex. 1 point pour 1 000 XOF). */
  @Prop({ type: Number, min: 0, default: 1 })
  points_per_unit!: number;

  /** Valeur d'un point à l'utilisation (devise du programme). */
  @Prop({ type: Number, min: 0, default: 5 })
  point_value!: number;

  @Prop({ type: Number, min: 0, default: 0 })
  min_redeem_points!: number;

  /** 0 = pas d'expiration. */
  @Prop({ type: Number, min: 0, default: 0 })
  points_expiry_months!: number;

  @Prop({ type: [LoyaltyTierRuleSchema], default: [] })
  tiers!: LoyaltyTierRule[];

  @Prop({ type: Boolean, default: true })
  earn_on_reservation!: boolean;

  @Prop({ type: Boolean, default: false })
  earn_on_pos!: boolean;

  @Prop({ type: Boolean, default: true, index: true })
  is_active!: boolean;

  @Prop({ type: String, maxlength: 2000 })
  description?: string;
}

export const LoyaltyProgramSchema =
  SchemaFactory.createForClass(LoyaltyProgram);
LoyaltyProgramSchema.index(
  { scope_key: 1 },
  {
    unique: true,
    partialFilterExpression: { is_active: true, is_deleted: false },
    name: 'uniq_active_program_per_scope',
  },
);
