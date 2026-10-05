import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { AuditableEntity } from '../../base-entities/embeddables/auditable.entity';
import { RoomStatus } from '../../base-entities/enums/room-status.enum';

export type RoomDocument = HydratedDocument<Room>;

@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'rooms',
})
export class Room extends AuditableEntity {
  @Prop({ type: Types.ObjectId, ref: 'Property', required: true, index: true })
  property_id!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'RoomType', required: true, index: true })
  room_type_id!: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true, maxlength: 20 })
  number!: string;

  @Prop({ type: Number, min: 0 })
  floor?: number;

  @Prop({
    type: String,
    enum: Object.values(RoomStatus),
    default: RoomStatus.CLEAN,
    index: true,
  })
  status!: RoomStatus;

  @Prop({ type: Number, min: 1, default: 2 })
  max_occupancy?: number;

  @Prop({ type: [String], default: () => [] })
  amenities!: string[];

  @Prop({ type: String, maxlength: 500 })
  notes?: string;

  @Prop({ type: Boolean, default: true })
  is_active!: boolean;
}

export const RoomSchema = SchemaFactory.createForClass(Room);

RoomSchema.index({ property_id: 1, number: 1 }, { unique: true });
RoomSchema.index({ property_id: 1, status: 1 });
RoomSchema.index({ room_type_id: 1 });
