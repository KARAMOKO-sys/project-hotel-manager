import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { AuditableEntity } from '../../base-entities/embeddables/auditable.entity';

export type LeaveAllocationDocument = HydratedDocument<LeaveAllocation>;

/** Droits à congé d'un employé pour un type et une année. */
@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'hr_leave_allocations',
})
export class LeaveAllocation extends AuditableEntity {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Property',
    required: true,
    index: true,
  })
  property_id!: Types.ObjectId;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Staff',
    required: true,
    index: true,
  })
  staff_id!: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'LeaveType', required: true })
  leave_type_id!: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 2000, max: 2100 })
  year!: number;

  @Prop({ type: Number, required: true, min: 0, max: 366 })
  days!: number;

  @Prop({ type: String, maxlength: 500 })
  notes?: string;
}

export const LeaveAllocationSchema =
  SchemaFactory.createForClass(LeaveAllocation);
LeaveAllocationSchema.index(
  { staff_id: 1, leave_type_id: 1, year: 1 },
  { unique: true, partialFilterExpression: { is_deleted: false } },
);
