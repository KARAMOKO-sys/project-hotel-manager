import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { AuditableEntity } from '../../base-entities/embeddables/auditable.entity';

export type GuestSegmentDocument = HydratedDocument<GuestSegment>;

/**
 * Segment de clients défini par des critères dynamiques.
 */
@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'guest_segments',
})
export class GuestSegment extends AuditableEntity {
  @Prop({ type: Types.ObjectId, ref: 'Property', index: true })
  property_id?: Types.ObjectId;

  @Prop({
    type: String,
    required: true,
    trim: true,
    maxlength: 150,
    index: true,
  })
  name!: string;

  @Prop({ type: String, maxlength: 500 })
  description?: string;

  @Prop({ type: Object, default: () => ({}) })
  criteria!: Record<string, any>;

  @Prop({ type: Number, min: 0, default: 0 })
  member_count!: number;

  @Prop({ type: Boolean, default: true })
  is_active!: boolean;
}

export const GuestSegmentSchema = SchemaFactory.createForClass(GuestSegment);

GuestSegmentSchema.index({ property_id: 1, is_active: 1 });
