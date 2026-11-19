import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { AuditableEntity } from '../../base-entities/embeddables/auditable.entity';

export type AttendanceDocument = HydratedDocument<Attendance>;

export enum AttendanceSource {
  MANUAL = 'manual',
  KIOSK = 'kiosk',
  MOBILE = 'mobile',
}

/** Pointage (entrée / sortie) d'un employé. */
@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'hr_attendances',
})
export class Attendance extends AuditableEntity {
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

  @Prop({ type: Date, required: true })
  check_in!: Date;

  @Prop({ type: Date })
  check_out?: Date;

  /** Vrai tant que la sortie n'est pas pointée (un seul pointage ouvert). */
  @Prop({ type: Boolean, default: true })
  is_open!: boolean;

  @Prop({ type: Number, min: 0, default: 0 })
  worked_hours!: number;

  @Prop({
    type: String,
    enum: Object.values(AttendanceSource),
    default: AttendanceSource.MANUAL,
  })
  source!: AttendanceSource;

  @Prop({ type: String, maxlength: 500 })
  notes?: string;
}

export const AttendanceSchema = SchemaFactory.createForClass(Attendance);
AttendanceSchema.index(
  { staff_id: 1 },
  {
    unique: true,
    partialFilterExpression: { is_open: true, is_deleted: false },
    name: 'uniq_open_attendance_per_staff',
  },
);
AttendanceSchema.index({ property_id: 1, check_in: 1 });
