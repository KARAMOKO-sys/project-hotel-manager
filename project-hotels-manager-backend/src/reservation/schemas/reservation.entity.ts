import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { AuditableEntity } from '../../base-entities/embeddables/auditable.entity';
import {
  MoneyEmbeddable,
  MoneySchema,
} from '../../base-entities/embeddables/money.embeddable';
import { BookingChannel } from '../../base-entities/enums/booking-channel.enum';
import { ReservationSource } from '../../base-entities/enums/reservation-source.enum';

export type ReservationDocument = HydratedDocument<Reservation>;

export enum ReservationStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CHECKED_IN = 'checked_in',
  CHECKED_OUT = 'checked_out',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
}

@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'reservations',
})
export class Reservation extends AuditableEntity {
  @Prop({
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
    maxlength: 20,
    index: true,
  })
  confirmation_code!: string;

  @Prop({ type: Types.ObjectId, ref: 'Property', required: true, index: true })
  property_id!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Guest', required: true, index: true })
  guest_id!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'RoomType', index: true })
  room_type_id?: Types.ObjectId;

  @Prop({ type: Date, required: true })
  check_in!: Date;

  @Prop({ type: Date, required: true })
  check_out!: Date;

  @Prop({
    type: String,
    enum: Object.values(ReservationStatus),
    default: ReservationStatus.PENDING,
    index: true,
  })
  status!: ReservationStatus;

  @Prop({
    type: String,
    enum: Object.values(ReservationSource),
    default: ReservationSource.DIRECT,
  })
  source!: ReservationSource;

  @Prop({
    type: String,
    enum: Object.values(BookingChannel),
    default: BookingChannel.WEBSITE,
  })
  channel!: BookingChannel;

  @Prop({ type: Number, min: 1, default: 2 })
  adults?: number;

  @Prop({ type: Number, min: 0, default: 0 })
  children?: number;

  @Prop({ type: MoneySchema, default: () => ({ amount: 0, currency: 'XOF' }) })
  total_amount!: MoneyEmbeddable;

  @Prop({ type: String, maxlength: 1000 })
  special_requests?: string;

  @Prop({ type: String, maxlength: 500 })
  cancellation_reason?: string;

  @Prop({ type: Number, min: 0, default: 0 })
  cancellation_fee?: number;

  @Prop({ type: String, maxlength: 500 })
  notes?: string;

  @Prop({ type: Object, default: () => ({}) })
  metadata!: Record<string, any>;
}

export const ReservationSchema = SchemaFactory.createForClass(Reservation);

ReservationSchema.index({ property_id: 1, check_in: 1, check_out: 1 });
ReservationSchema.index({ guest_id: 1 });
ReservationSchema.index({ status: 1 });
