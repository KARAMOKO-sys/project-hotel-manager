import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { AuditableEntity } from '../../base-entities/embeddables/auditable.entity';
import { TaskPriority } from '../../base-entities/enums/task-priority.enum';
import { TaskStatus } from '../../base-entities/enums/task-status.enum';

export type GuestRequestDocument = HydratedDocument<GuestRequest>;

/**
 * Demande d'un client (serviettes, réveil, room service…).
 */
@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'guest_requests',
})
export class GuestRequest extends AuditableEntity {
  @Prop({ type: Types.ObjectId, ref: 'Property', required: true, index: true })
  property_id!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Guest', index: true })
  guest_id?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Room', index: true })
  room_id?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', index: true })
  staff_id?: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true, maxlength: 100 })
  type!: string;

  @Prop({ type: String, maxlength: 1000 })
  description?: string;

  @Prop({
    type: String,
    enum: Object.values(TaskStatus),
    default: TaskStatus.PENDING,
    index: true,
  })
  status!: TaskStatus;

  @Prop({
    type: String,
    enum: Object.values(TaskPriority),
    default: TaskPriority.NORMAL,
  })
  priority!: TaskPriority;

  @Prop({ type: Date })
  completed_at?: Date;

  @Prop({ type: String, maxlength: 500 })
  cancelled_reason?: string;

  @Prop({ type: Number, min: 1, max: 5 })
  satisfaction_rating?: number;
}

export const GuestRequestSchema = SchemaFactory.createForClass(GuestRequest);

GuestRequestSchema.index({ property_id: 1, status: 1 });
GuestRequestSchema.index({ guest_id: 1 });
GuestRequestSchema.index({ room_id: 1 });
