import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { AuditableEntity } from '../../base-entities/embeddables/auditable.entity';
import { HOUR_MINUTE_REGEX } from '../hr.utils';

export type ShiftAssignmentDocument = HydratedDocument<ShiftAssignment>;

export enum ShiftState {
  PLANNED = 'planned',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
}

/**
 * Créneau planifié d'un employé à une date. `starts_at` / `ends_at` sont
 * calculés (un service de nuit se termine le lendemain) et servent aux
 * contrôles de chevauchement.
 */
@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'hr_shift_assignments',
})
export class ShiftAssignment extends AuditableEntity {
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

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Department' })
  department_id?: Types.ObjectId;

  /** Jour de prise de poste (minuit UTC). */
  @Prop({ type: Date, required: true })
  date!: Date;

  @Prop({ type: String, required: true, match: HOUR_MINUTE_REGEX })
  start_time!: string;

  @Prop({ type: String, required: true, match: HOUR_MINUTE_REGEX })
  end_time!: string;

  @Prop({ type: Date, required: true })
  starts_at!: Date;

  @Prop({ type: Date, required: true })
  ends_at!: Date;

  @Prop({ type: Number, min: 0, default: 0 })
  hours!: number;

  /** Poste occupé (ex. « Réception nuit »). */
  @Prop({ type: String, trim: true, maxlength: 150 })
  role?: string;

  @Prop({
    type: String,
    enum: Object.values(ShiftState),
    default: ShiftState.PLANNED,
  })
  state!: ShiftState;

  @Prop({ type: String, maxlength: 500 })
  notes?: string;
}

export const ShiftAssignmentSchema =
  SchemaFactory.createForClass(ShiftAssignment);
ShiftAssignmentSchema.index({ staff_id: 1, starts_at: 1, ends_at: 1 });
ShiftAssignmentSchema.index({ property_id: 1, date: 1 });
