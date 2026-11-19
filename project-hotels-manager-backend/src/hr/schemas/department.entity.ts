import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { AuditableEntity } from '../../base-entities/embeddables/auditable.entity';

export type DepartmentDocument = HydratedDocument<Department>;

/** Service / département RH d'un établissement (hiérarchique). */
@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'hr_departments',
})
export class Department extends AuditableEntity {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Property',
    required: true,
    index: true,
  })
  property_id!: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true, maxlength: 150 })
  name!: string;

  /** Code court unique par établissement (ex. `RECEP`). */
  @Prop({
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    maxlength: 30,
  })
  code!: string;

  /** Responsable : affectation `Staff`. */
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Staff' })
  manager_staff_id?: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Department' })
  parent_id?: Types.ObjectId;

  @Prop({ type: Boolean, default: true })
  is_active!: boolean;
}

export const DepartmentSchema = SchemaFactory.createForClass(Department);
DepartmentSchema.index(
  { property_id: 1, code: 1 },
  { unique: true, partialFilterExpression: { is_deleted: false } },
);
