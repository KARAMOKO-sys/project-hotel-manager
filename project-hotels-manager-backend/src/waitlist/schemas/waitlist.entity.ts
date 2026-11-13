import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types, SchemaTypes } from 'mongoose';
import { AuditableEntity } from '../../base-entities/embeddables/auditable.entity';
import { LoyaltyTier } from '../../base-entities/enums/loyalty-tier.enum';
import { NotificationChannel } from '../../base-entities/enums/notification-channel.enum';

export type WaitlistDocument = HydratedDocument<Waitlist>;

/** Cycle de vie d'une entrée de liste d'attente. */
export enum WaitlistStatus {
  /** En attente d'une disponibilité. */
  WAITING = 'waiting',
  /** Client notifié, en attente de sa confirmation (délai de 4 h). */
  NOTIFIED = 'notified',
  /** Client ayant confirmé dans le délai. */
  CONFIRMED = 'confirmed',
  /** Entrée transformée en réservation. */
  CONVERTED = 'converted',
  /** Délai de confirmation dépassé. */
  EXPIRED = 'expired',
  /** Retrait volontaire / annulation. */
  CANCELLED = 'cancelled',
}

/** Délai accordé au client pour confirmer après notification (heures). */
export const WAITLIST_CONFIRMATION_DELAY_HOURS = 4;

/** Bonus de priorité selon le niveau de fidélité (clients fidèles prioritaires). */
export const WAITLIST_LOYALTY_PRIORITY: Record<LoyaltyTier, number> = {
  [LoyaltyTier.BRONZE]: 0,
  [LoyaltyTier.SILVER]: 10,
  [LoyaltyTier.GOLD]: 20,
  [LoyaltyTier.PLATINUM]: 30,
};

/** Préférences exprimées par le client en liste d'attente. */
@Schema({ _id: false })
export class WaitlistPreferences {
  @Prop({ type: [{ type: SchemaTypes.ObjectId, ref: 'RoomType' }], default: [] })
  alternative_room_type_ids!: Types.ObjectId[];

  @Prop({ type: String, maxlength: 50 })
  bed_type?: string;

  @Prop({ type: String, maxlength: 50 })
  view?: string;

  @Prop({ type: Number })
  floor?: number;

  @Prop({ type: Boolean })
  smoking?: boolean;

  /** Accepte des dates proches (± `date_flexibility_days`). */
  @Prop({ type: Number, min: 0, max: 14, default: 0 })
  date_flexibility_days!: number;

  @Prop({ type: Number, min: 0 })
  max_budget?: number;

  @Prop({ type: String, maxlength: 500 })
  notes?: string;
}

export const WaitlistPreferencesSchema =
  SchemaFactory.createForClass(WaitlistPreferences);

/**
 * Entrée de liste d'attente : un client souhaitant un séjour sur une période
 * complète. Les entrées sont servies par priorité décroissante (fidélité),
 * puis par ancienneté.
 */
@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'waitlists',
})
export class Waitlist extends AuditableEntity {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Property', required: true, index: true })
  property_id!: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Guest', required: true, index: true })
  guest_id!: Types.ObjectId;

  /** Type de chambre souhaité (absent = n'importe quel type). */
  @Prop({ type: SchemaTypes.ObjectId, ref: 'RoomType', index: true })
  room_type_id?: Types.ObjectId;

  @Prop({ type: Date, required: true })
  check_in!: Date;

  @Prop({ type: Date, required: true })
  check_out!: Date;

  @Prop({ type: Number, min: 1, default: 1 })
  adults!: number;

  @Prop({ type: Number, min: 0, default: 0 })
  children!: number;

  @Prop({ type: WaitlistPreferencesSchema, default: () => ({}) })
  preferences!: WaitlistPreferences;

  @Prop({
    type: String,
    enum: Object.values(WaitlistStatus),
    default: WaitlistStatus.WAITING,
    index: true,
  })
  status!: WaitlistStatus;

  @Prop({
    type: String,
    enum: Object.values(LoyaltyTier),
    default: LoyaltyTier.BRONZE,
  })
  loyalty_tier!: LoyaltyTier;

  /** Priorité calculée (fidélité + bonus manuel). Plus élevé = servi d'abord. */
  @Prop({ type: Number, default: 0, index: true })
  priority!: number;

  @Prop({
    type: String,
    enum: Object.values(NotificationChannel),
    default: NotificationChannel.EMAIL,
  })
  notification_channel!: NotificationChannel;

  @Prop({ type: String, trim: true, lowercase: true })
  contact_email?: string;

  @Prop({ type: String, trim: true })
  contact_phone?: string;

  @Prop({ type: Date })
  notified_at?: Date;

  /** Date limite de confirmation (notification + 4 h). */
  @Prop({ type: Date, index: true })
  confirmation_deadline?: Date;

  @Prop({ type: Date })
  confirmed_at?: Date;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Reservation' })
  reservation_id?: Types.ObjectId;

  @Prop({ type: Number, min: 0, default: 0 })
  notification_count!: number;

  @Prop({ type: String, maxlength: 500 })
  cancellation_reason?: string;
}

export const WaitlistSchema = SchemaFactory.createForClass(Waitlist);

WaitlistSchema.index({
  property_id: 1,
  status: 1,
  priority: -1,
  created_at: 1,
});
WaitlistSchema.index({ property_id: 1, check_in: 1, check_out: 1 });
WaitlistSchema.index({ status: 1, confirmation_deadline: 1 });
