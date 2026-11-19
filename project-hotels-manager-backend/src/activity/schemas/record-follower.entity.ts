import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

export type RecordFollowerDocument = HydratedDocument<RecordFollower>;

/**
 * Abonné au fil de discussion d'une fiche.
 * Suppression physique au désabonnement (index unique).
 */
@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'record_followers',
})
export class RecordFollower {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Property', index: true })
  property_id?: Types.ObjectId;

  @Prop({ type: String, required: true, maxlength: 100 })
  res_model!: string;

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  res_id!: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, required: true, index: true })
  user_id!: Types.ObjectId;

  @Prop({ type: String, maxlength: 50 })
  user_type?: string;

  created_at?: Date;
  updated_at?: Date;
}

export const RecordFollowerSchema =
  SchemaFactory.createForClass(RecordFollower);
RecordFollowerSchema.index(
  { res_model: 1, res_id: 1, user_id: 1 },
  { unique: true },
);
