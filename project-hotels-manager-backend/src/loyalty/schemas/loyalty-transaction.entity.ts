import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { AuditableEntity } from '../../base-entities/embeddables/auditable.entity';

export type LoyaltyTransactionDocument = HydratedDocument<LoyaltyTransaction>;

export enum LoyaltyTransactionType {
  EARN = 'earn',
  REDEEM = 'redeem',
  ADJUST = 'adjust',
  EXPIRE = 'expire',
}

/** Origine d'un mouvement (clé d'idempotence). */
@Schema({ _id: false })
export class LoyaltySource {
  /** Modèle (`Reservation`, `PosTransaction`, `LoyaltyTransaction`). */
  @Prop({ type: String, required: true })
  model!: string;

  @Prop({ type: String, required: true })
  id!: string;

  /** Nom de l'événement ou action (`hotel.reservation.checked_out`, `expire`). */
  @Prop({ type: String, required: true })
  event!: string;
}
export const LoyaltySourceSchema = SchemaFactory.createForClass(LoyaltySource);

/**
 * Grand livre des points (montants signés). Les lots positifs (gain,
 * ajustement +) portent `remaining_points`, consommés en FIFO par les
 * utilisations, ajustements négatifs et expirations.
 */
@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'loyalty_transactions',
})
export class LoyaltyTransaction extends AuditableEntity {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'LoyaltyAccount',
    required: true,
    index: true,
  })
  account_id!: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'LoyaltyProgram', required: true })
  program_id!: Types.ObjectId;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Guest',
    required: true,
    index: true,
  })
  guest_id!: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Property' })
  property_id?: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(LoyaltyTransactionType),
    required: true,
  })
  type!: LoyaltyTransactionType;

  /** Points signés (+ gain / − utilisation, expiration). */
  @Prop({ type: Number, required: true })
  points!: number;

  /** Lot positif : points non encore consommés ni expirés. */
  @Prop({ type: Number, min: 0, default: 0 })
  remaining_points!: number;

  @Prop({ type: LoyaltySourceSchema })
  source?: LoyaltySource;

  @Prop({ type: Date, index: true })
  expires_at?: Date;

  @Prop({ type: Boolean, default: false })
  expired!: boolean;

  /** Montant à l'origine du gain, ou valeur monétaire d'une utilisation. */
  @Prop({ type: Number, min: 0 })
  amount?: number;

  @Prop({ type: String, maxlength: 3 })
  currency?: string;

  @Prop({ type: Number })
  multiplier?: number;

  @Prop({ type: String, maxlength: 500 })
  description?: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' })
  actor_id?: Types.ObjectId;
}

export const LoyaltyTransactionSchema =
  SchemaFactory.createForClass(LoyaltyTransaction);
// Idempotence des gains / expirations : une seule écriture par origine.
// (Équivalent « sparse » : seules les écritures ayant une origine sont indexées.)
LoyaltyTransactionSchema.index(
  { 'source.model': 1, 'source.id': 1, 'source.event': 1 },
  {
    unique: true,
    partialFilterExpression: { 'source.id': { $exists: true } },
    name: 'uniq_loyalty_source',
  },
);
LoyaltyTransactionSchema.index({ account_id: 1, created_at: 1 });
LoyaltyTransactionSchema.index({
  expires_at: 1,
  remaining_points: 1,
  expired: 1,
});
