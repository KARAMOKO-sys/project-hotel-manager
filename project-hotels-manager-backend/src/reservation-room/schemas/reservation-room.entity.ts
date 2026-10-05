import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { AuditableEntity } from '../../base-entities/embeddables/auditable.entity';
import {
  MoneyEmbeddable,
  MoneySchema,
} from '../../base-entities/embeddables/money.embeddable';

export type ReservationRoomDocument = HydratedDocument<ReservationRoom>;

/**
 * Lien entre une réservation et une chambre concrète (avec le tarif appliqué).
 */
@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'reservation_rooms',
})
export class ReservationRoom extends AuditableEntity {
  @Prop({
    type: Types.ObjectId,
    ref: 'Reservation',
    required: true,
    index: true,
  })
  reservation_id!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Room', required: true, index: true })
  room_id!: Types.ObjectId;

  @Prop({ type: MoneySchema, default: () => ({ amount: 0, currency: 'XOF' }) })
  rate!: MoneyEmbeddable;

  @Prop({ type: Number, min: 1, default: 1 })
  guests?: number;

  @Prop({ type: String, maxlength: 500 })
  notes?: string;
}

export const ReservationRoomSchema =
  SchemaFactory.createForClass(ReservationRoom);

ReservationRoomSchema.index(
  { reservation_id: 1, room_id: 1 },
  { unique: true },
);
