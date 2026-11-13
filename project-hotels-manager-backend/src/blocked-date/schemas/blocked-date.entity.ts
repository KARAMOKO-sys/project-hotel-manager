import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types, SchemaTypes } from 'mongoose';
import { AuditableEntity } from '../../base-entities/embeddables/auditable.entity';

export type BlockedDateDocument = HydratedDocument<BlockedDate>;

/** Motif du blocage d'une période. */
export enum BlockReason {
  MAINTENANCE = 'maintenance',
  RENOVATION = 'renovation',
  OWNER_USE = 'owner_use',
  EVENT = 'event',
  OTHER = 'other',
}

/**
 * Période bloquée (non réservable) pour une chambre, un type de chambre
 * ou l'ensemble d'un établissement.
 *
 * - `room_id` renseigné : blocage d'une chambre précise ;
 * - `room_type_id` renseigné : blocage de tout un type de chambre ;
 * - aucun des deux : blocage de toute la propriété.
 *
 * Les bornes `start_date` et `end_date` sont inclusives (jour entier).
 */
@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'blocked_dates',
})
export class BlockedDate extends AuditableEntity {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Property', required: true, index: true })
  property_id!: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Room', index: true })
  room_id?: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'RoomType', index: true })
  room_type_id?: Types.ObjectId;

  @Prop({ type: Date, required: true })
  start_date!: Date;

  @Prop({ type: Date, required: true })
  end_date!: Date;

  @Prop({
    type: String,
    enum: Object.values(BlockReason),
    default: BlockReason.OTHER,
  })
  reason!: BlockReason;

  @Prop({ type: String, maxlength: 500 })
  notes?: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' })
  blocked_by?: Types.ObjectId;

  /** Passe à `false` lorsque la période est libérée (déblocage). */
  @Prop({ type: Boolean, default: true, index: true })
  is_active!: boolean;

  @Prop({ type: Date })
  unblocked_at?: Date;
}

export const BlockedDateSchema = SchemaFactory.createForClass(BlockedDate);

BlockedDateSchema.index({ property_id: 1, start_date: 1, end_date: 1 });
BlockedDateSchema.index({ room_id: 1, start_date: 1, end_date: 1 });
BlockedDateSchema.index({ room_type_id: 1, start_date: 1, end_date: 1 });
