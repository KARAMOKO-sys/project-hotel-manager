import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { AuditableEntity } from '../../base-entities/embeddables/auditable.entity';
import { CustomFieldOption, CustomFieldType } from '../custom-field-types';

export type CustomFieldDocument = HydratedDocument<CustomField>;

/**
 * Définition d'un champ personnalisé ajouté à un modèle de fiche, pour une
 * organisation entière ou un seul établissement.
 */
@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'studio_custom_fields',
})
export class CustomField extends AuditableEntity {
  /** Portée organisation (exclusive avec `property_id`). */
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Organization', index: true })
  organization_id?: Types.ObjectId;

  /** Portée établissement (exclusive avec `organization_id`). */
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Property', index: true })
  property_id?: Types.ObjectId;

  /** Modèle de fiche (registre `records`). */
  @Prop({ type: String, required: true, maxlength: 100, index: true })
  res_model!: string;

  @Prop({ type: String, required: true, maxlength: 41 })
  key!: string;

  @Prop({ type: String, required: true, trim: true, maxlength: 100 })
  label!: string;

  @Prop({
    type: String,
    enum: Object.values(CustomFieldType),
    required: true,
  })
  field_type!: CustomFieldType;

  @Prop({
    type: [{ _id: false, value: String, label: String }],
    default: undefined,
  })
  options?: CustomFieldOption[];

  @Prop({ type: Boolean, default: false })
  required!: boolean;

  @Prop({ type: SchemaTypes.Mixed })
  default_value?: unknown;

  @Prop({ type: String, maxlength: 500 })
  help?: string;

  @Prop({ type: Number, default: 10 })
  sequence!: number;

  @Prop({ type: Boolean, default: true, index: true })
  is_active!: boolean;
}

export const CustomFieldSchema = SchemaFactory.createForClass(CustomField);
CustomFieldSchema.index(
  { organization_id: 1, property_id: 1, res_model: 1, key: 1 },
  { unique: true, partialFilterExpression: { is_deleted: false } },
);
