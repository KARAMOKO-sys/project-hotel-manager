import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

export type CustomFieldValueDocument = HydratedDocument<CustomFieldValue>;

/**
 * Valeurs des champs personnalisés d'une fiche, stockées à part des
 * documents métier (aucune modification des autres modules).
 */
@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'studio_custom_field_values',
  minimize: false,
})
export class CustomFieldValue {
  @Prop({ type: String, required: true, maxlength: 100 })
  res_model!: string;

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  res_id!: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Property', index: true })
  property_id?: Types.ObjectId;

  @Prop({ type: SchemaTypes.Mixed, default: {} })
  values!: Record<string, unknown>;

  @Prop({ type: SchemaTypes.ObjectId })
  updated_by?: Types.ObjectId;

  created_at?: Date;
  updated_at?: Date;
}

export const CustomFieldValueSchema =
  SchemaFactory.createForClass(CustomFieldValue);
CustomFieldValueSchema.index({ res_model: 1, res_id: 1 }, { unique: true });
