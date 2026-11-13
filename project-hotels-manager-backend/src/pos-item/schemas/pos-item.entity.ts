import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types, SchemaTypes } from 'mongoose';
import { AuditableEntity } from '../../base-entities/embeddables/auditable.entity';
import {
  MoneyEmbeddable,
  MoneySchema,
} from '../../base-entities/embeddables/money.embeddable';

export type PosItemDocument = HydratedDocument<PosItem>;

/** Catégories d'articles / points de vente (extras facturables). */
export enum PosCategory {
  BAR = 'bar',
  RESTAURANT = 'restaurant',
  MINIBAR = 'minibar',
  SPA = 'spa',
  ACTIVITY = 'activity',
  LAUNDRY = 'laundry',
  BOUTIQUE = 'boutique',
  ROOM_SERVICE = 'room_service',
  OTHER = 'other',
}

/**
 * Article vendable au point de vente (boisson, soin spa, activité,
 * prestation de blanchisserie…), avec suivi de stock optionnel.
 */
@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'pos_items',
})
export class PosItem extends AuditableEntity {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Property', required: true, index: true })
  property_id!: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true, maxlength: 150 })
  name!: string;

  /** Référence interne (unique par établissement lorsqu'elle est renseignée). */
  @Prop({ type: String, trim: true, uppercase: true, maxlength: 50 })
  sku?: string;

  @Prop({ type: String, maxlength: 1000 })
  description?: string;

  @Prop({
    type: String,
    enum: Object.values(PosCategory),
    required: true,
    index: true,
  })
  category!: PosCategory;

  @Prop({
    type: MoneySchema,
    required: true,
    default: () => ({ amount: 0, currency: 'XOF' }),
  })
  price!: MoneyEmbeddable;

  /** Coût d'achat unitaire (pour le calcul de marge). */
  @Prop({ type: Number, min: 0 })
  cost_price?: number;

  /** Taux de taxe applicable en pourcentage (ex : 18 pour 18 %). */
  @Prop({ type: Number, min: 0, max: 100, default: 0 })
  tax_rate!: number;

  /** Indique si le stock est suivi (faux pour les services : spa, activités…). */
  @Prop({ type: Boolean, default: true })
  track_stock!: boolean;

  @Prop({ type: Number, min: 0, default: 0 })
  stock_quantity!: number;

  /** Seuil en dessous duquel une alerte de stock bas est levée. */
  @Prop({ type: Number, min: 0, default: 5 })
  low_stock_threshold!: number;

  @Prop({ type: String, trim: true, maxlength: 30, default: 'unit' })
  unit!: string;

  @Prop({ type: Boolean, default: true, index: true })
  is_active!: boolean;

  @Prop({ type: String, trim: true, maxlength: 500 })
  image_url?: string;

  @Prop({ type: Object, default: () => ({}) })
  metadata!: Record<string, any>;
}

export const PosItemSchema = SchemaFactory.createForClass(PosItem);

PosItemSchema.index(
  { property_id: 1, sku: 1 },
  { unique: true, partialFilterExpression: { sku: { $type: 'string' } } },
);
PosItemSchema.index({ property_id: 1, category: 1, is_active: 1 });
PosItemSchema.index({ property_id: 1, track_stock: 1, stock_quantity: 1 });
