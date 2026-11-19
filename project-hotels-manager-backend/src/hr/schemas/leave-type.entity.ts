import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { AuditableEntity } from '../../base-entities/embeddables/auditable.entity';

export type LeaveTypeDocument = HydratedDocument<LeaveType>;

/** Type de congé (congés payés, maladie, sans solde…). */
@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'hr_leave_types',
})
export class LeaveType extends AuditableEntity {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Property',
    required: true,
    index: true,
  })
  property_id!: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true, maxlength: 150 })
  name!: string;

  @Prop({
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    maxlength: 30,
  })
  code!: string;

  @Prop({ type: Boolean, default: true })
  paid!: boolean;

  /** Sinon la demande est approuvée automatiquement à la soumission. */
  @Prop({ type: Boolean, default: true })
  requires_approval!: boolean;

  /**
   * Contrôle du solde à la soumission (allocations). Désactiver pour les
   * congés non plafonnés (sans solde, maladie…).
   */
  @Prop({ type: Boolean, default: true })
  requires_allocation!: boolean;

  /** Jours attribués chaque année (génération des allocations). */
  @Prop({ type: Number, min: 0, max: 366, default: 0 })
  annual_allocation_days!: number;

  @Prop({ type: Boolean, default: true })
  is_active!: boolean;
}

export const LeaveTypeSchema = SchemaFactory.createForClass(LeaveType);
LeaveTypeSchema.index(
  { property_id: 1, code: 1 },
  { unique: true, partialFilterExpression: { is_deleted: false } },
);
