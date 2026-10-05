import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { AuditableEntity } from '../../base-entities/embeddables/auditable.entity';
import { TaskPriority } from '../../base-entities/enums/task-priority.enum';
import { TaskStatus } from '../../base-entities/enums/task-status.enum';

export type HousekeepingDocument = HydratedDocument<Housekeeping>;

/**
 * Tâche de ménage associée à une chambre.
 */
@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'housekeeping_tasks',
})
export class Housekeeping extends AuditableEntity {
  @Prop({ type: Types.ObjectId, ref: 'Property', required: true, index: true })
  property_id!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Room', required: true, index: true })
  room_id!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', index: true })
  staff_id?: Types.ObjectId;

  @Prop({ type: Date, required: true })
  task_date!: Date;

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
    index: true,
  })
  priority!: TaskPriority;

  @Prop({ type: String, maxlength: 500 })
  description?: string;

  @Prop({ type: String, maxlength: 500 })
  notes?: string;

  @Prop({ type: [String], default: () => [] })
  photos!: string[];

  @Prop({ type: Date })
  completed_at?: Date;

  @Prop({ type: String, maxlength: 500 })
  skipped_reason?: string;
}

export const HousekeepingSchema = SchemaFactory.createForClass(Housekeeping);

HousekeepingSchema.index({ property_id: 1, task_date: 1, status: 1 });
HousekeepingSchema.index({ staff_id: 1, task_date: 1 });
