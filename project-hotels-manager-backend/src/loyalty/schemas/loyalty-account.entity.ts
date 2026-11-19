import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { AuditableEntity } from '../../base-entities/embeddables/auditable.entity';
import { LoyaltyTier } from '../../base-entities/enums/loyalty-tier.enum';

export type LoyaltyAccountDocument = HydratedDocument<LoyaltyAccount>;

/** Compte de fidélité d'un client dans un programme. */
@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'loyalty_accounts',
})
export class LoyaltyAccount extends AuditableEntity {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'LoyaltyProgram',
    required: true,
    index: true,
  })
  program_id!: Types.ObjectId;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Guest',
    required: true,
    index: true,
  })
  guest_id!: Types.ObjectId;

  /** Portée copiée du programme (filtrage, droits). */
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Property', index: true })
  property_id?: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Organization', index: true })
  organization_id?: Types.ObjectId;

  @Prop({ type: Number, min: 0, default: 0 })
  balance!: number;

  /** Cumul des points gagnés (base du niveau). */
  @Prop({ type: Number, min: 0, default: 0 })
  lifetime_points!: number;

  @Prop({
    type: String,
    enum: Object.values(LoyaltyTier),
    default: LoyaltyTier.BRONZE,
  })
  tier!: LoyaltyTier;

  @Prop({ type: Date })
  last_activity_at?: Date;

  @Prop({ type: Boolean, default: true })
  is_active!: boolean;
}

export const LoyaltyAccountSchema =
  SchemaFactory.createForClass(LoyaltyAccount);
LoyaltyAccountSchema.index(
  { program_id: 1, guest_id: 1 },
  { unique: true, name: 'uniq_guest_per_program' },
);
