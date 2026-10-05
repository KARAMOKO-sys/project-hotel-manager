import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { AuditableEntity } from '../../base-entities/embeddables/auditable.entity';
import {
  MoneyEmbeddable,
  MoneySchema,
} from '../../base-entities/embeddables/money.embeddable';

export type RoomTypeDocument = HydratedDocument<RoomType>;

@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'room_types',
})
export class RoomType extends AuditableEntity {
  @Prop({ type: Types.ObjectId, ref: 'Property', required: true, index: true })
  property_id!: Types.ObjectId;

  @Prop({
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
    index: true,
  })
  name!: string;

  @Prop({
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    maxlength: 50,
  })
  code!: string;

  @Prop({ type: String, maxlength: 500 })
  description?: string;

  @Prop({
    type: MoneySchema,
    required: true,
    default: () => ({ amount: 0, currency: 'XOF' }),
  })
  base_price!: MoneyEmbeddable;

  @Prop({ type: Number, min: 1, default: 2 })
  capacity_adults?: number;

  @Prop({ type: Number, min: 0, default: 0 })
  capacity_children?: number;

  @Prop({ type: Number, min: 0, default: 0 })
  total_rooms?: number;

  @Prop({ type: String })
  bed_type?: string;

  @Prop({ type: Number })
  size_sqm?: number;

  @Prop({ type: [String], default: () => [] })
  amenities!: string[];

  @Prop({ type: [String], default: () => [] })
  images!: string[];

  @Prop({ type: Boolean, default: true })
  is_active!: boolean;
}

export const RoomTypeSchema = SchemaFactory.createForClass(RoomType);

RoomTypeSchema.index({ property_id: 1, code: 1 }, { unique: true });
RoomTypeSchema.index({ property_id: 1, is_active: 1 });
