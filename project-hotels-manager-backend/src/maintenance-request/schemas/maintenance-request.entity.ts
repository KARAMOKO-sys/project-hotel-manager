import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { AuditableEntity } from '../../base-entities/embeddables/auditable.entity';
import { MaintenanceCategory } from '../../base-entities/enums/maintenance-category.enum';
import { TaskPriority } from '../../base-entities/enums/task-priority.enum';
import { TaskStatus } from '../../base-entities/enums/task-status.enum';

export type MaintenanceRequestDocument = HydratedDocument<MaintenanceRequest>;

/**
 * Demande de maintenance (plomberie, électricité, climatisation…).
 */
@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'maintenance_requests',
})
export class MaintenanceRequest extends AuditableEntity {
  @Prop({ type: Types.ObjectId, ref: 'Property', required: true, index: true })
  property_id!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Room', index: true })
  room_id?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', index: true })
  staff_id?: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(MaintenanceCategory),
    default: MaintenanceCategory.OTHER,
    index: true,
  })
  category!: MaintenanceCategory;

  @Prop({ type: String, required: true, trim: true, maxlength: 255 })
  title!: string;

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
    index: true,
  })
  priority!: TaskPriority;

  @Prop({ type: String, maxlength: 100 })
  equipment?: string;

  @Prop({ type: Number, min: 0, default: 0 })
  cost!: number;

  @Prop({ type: String, maxlength: 1000 })
  resolution?: string;

  @Prop({ type: Date })
  completed_at?: Date;

  @Prop({ type: String, maxlength: 500 })
  cancelled_reason?: string;
}

export const MaintenanceRequestSchema =
  SchemaFactory.createForClass(MaintenanceRequest);

MaintenanceRequestSchema.index({ property_id: 1, status: 1 });
MaintenanceRequestSchema.index({ property_id: 1, priority: 1 });
