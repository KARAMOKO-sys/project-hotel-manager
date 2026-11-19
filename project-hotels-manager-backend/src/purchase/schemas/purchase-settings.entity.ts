import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { DEFAULT_APPROVAL_THRESHOLD } from '../purchase.utils';

export type PurchaseSettingsDocument = HydratedDocument<PurchaseSettings>;

/** Paramètres d'achat d'un établissement. */
@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'purchase_settings',
})
export class PurchaseSettings {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Property',
    required: true,
    unique: true,
  })
  property_id!: Types.ObjectId;

  /** Montant TTC au-delà duquel un bon de commande doit être approuvé. */
  @Prop({ type: Number, min: 0, default: DEFAULT_APPROVAL_THRESHOLD })
  approval_threshold!: number;

  /** Active la création automatique de brouillons sur stock bas. */
  @Prop({ type: Boolean, default: true })
  auto_reorder!: boolean;

  @Prop({ type: String })
  updated_by?: string;
}

export const PurchaseSettingsSchema =
  SchemaFactory.createForClass(PurchaseSettings);
