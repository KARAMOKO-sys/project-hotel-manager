import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { AuditableEntity } from '../../base-entities/embeddables/auditable.entity';

export type LeaveRequestDocument = HydratedDocument<LeaveRequest>;

export enum LeaveState {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  REFUSED = 'refused',
  CANCELLED = 'cancelled',
}

/** États qui « consomment » ou bloquent la période demandée. */
export const ACTIVE_LEAVE_STATES = [LeaveState.SUBMITTED, LeaveState.APPROVED];

/** Demande de congé. `days` est calculé par le serveur. */
@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'hr_leave_requests',
})
export class LeaveRequest extends AuditableEntity {
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

  @Prop({ type: Date, required: true })
  start_date!: Date;

  @Prop({ type: Date, required: true })
  end_date!: Date;

  @Prop({ type: Boolean, default: false })
  start_half_day!: boolean;

  @Prop({ type: Boolean, default: false })
  end_half_day!: boolean;

  @Prop({ type: Number, min: 0, required: true })
  days!: number;

  @Prop({ type: String, maxlength: 1000 })
  reason?: string;

  @Prop({
    type: String,
    enum: Object.values(LeaveState),
    default: LeaveState.DRAFT,
    index: true,
  })
  state!: LeaveState;

  @Prop({ type: Date })
  submitted_at?: Date;

  /** Utilisateur ayant approuvé ou refusé. */
  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' })
  approver_id?: Types.ObjectId;

  @Prop({ type: Date })
  decided_at?: Date;

  @Prop({ type: String, maxlength: 1000 })
  refusal_reason?: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' })
  requested_by?: Types.ObjectId;
}

export const LeaveRequestSchema = SchemaFactory.createForClass(LeaveRequest);
LeaveRequestSchema.index({ staff_id: 1, state: 1, start_date: 1, end_date: 1 });
LeaveRequestSchema.index({ property_id: 1, state: 1, start_date: 1 });
