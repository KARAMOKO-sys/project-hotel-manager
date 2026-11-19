import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { AuditableEntity } from '../../base-entities/embeddables/auditable.entity';

export type CrmStageDocument = HydratedDocument<CrmStage>;

/** Étape du pipeline commercial. */
@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'crm_stages',
})
export class CrmStage extends AuditableEntity {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Property',
    required: true,
    index: true,
  })
  property_id!: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true, maxlength: 100 })
  name!: string;

  @Prop({ type: Number, default: 10 })
  sequence!: number;

  /** Probabilité par défaut (%) des pistes à cette étape. */
  @Prop({ type: Number, min: 0, max: 100, default: 0 })
  probability!: number;

  @Prop({ type: Boolean, default: false })
  is_won!: boolean;

  @Prop({ type: Boolean, default: false })
  is_lost!: boolean;

  /** Colonne repliée dans le kanban. */
  @Prop({ type: Boolean, default: false })
  fold!: boolean;
}

export const CrmStageSchema = SchemaFactory.createForClass(CrmStage);
CrmStageSchema.index(
  { property_id: 1, name: 1 },
  { unique: true, partialFilterExpression: { is_deleted: false } },
);
CrmStageSchema.index({ property_id: 1, sequence: 1 });
