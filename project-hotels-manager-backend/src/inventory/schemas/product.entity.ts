import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { AuditableEntity } from '../../base-entities/embeddables/auditable.entity';
import { Currency } from '../../base-entities/enums/currency.enum';
import {
  ProductCategory,
  ProductType,
  UnitOfMeasure,
} from '../inventory.enums';

export type ProductDocument = HydratedDocument<Product>;

/**
 * Article géré en stock (minibar, produits d'accueil, linge, entretien…).
 * Le coût (`cost_price`) est un coût moyen pondéré tenu par le serveur.
 */
@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'products',
})
export class Product extends AuditableEntity {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Property',
    required: true,
    index: true,
  })
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
    enum: Object.values(ProductCategory),
    default: ProductCategory.OTHER,
    index: true,
  })
  category!: ProductCategory;

  @Prop({
    type: String,
    enum: Object.values(UnitOfMeasure),
    default: UnitOfMeasure.UNIT,
  })
  uom!: UnitOfMeasure;

  @Prop({
    type: String,
    enum: Object.values(ProductType),
    default: ProductType.STOCKABLE,
  })
  product_type!: ProductType;

  /** Coût moyen pondéré (mis à jour à chaque réception fournisseur). */
  @Prop({ type: Number, min: 0, default: 0 })
  cost_price!: number;

  @Prop({ type: Number, min: 0, default: 0 })
  sale_price!: number;

  @Prop({ type: String, enum: Object.values(Currency), default: Currency.XOF })
  currency!: Currency;

  /** Seuil minimum : en dessous, alerte et réapprovisionnement. */
  @Prop({ type: Number, min: 0, default: 0 })
  reorder_min!: number;

  /** Stock cible après réapprovisionnement. */
  @Prop({ type: Number, min: 0, default: 0 })
  reorder_max!: number;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Vendor' })
  preferred_vendor_id?: Types.ObjectId;

  /** Article de point de vente correspondant (facultatif). */
  @Prop({ type: SchemaTypes.ObjectId, ref: 'PosItem' })
  pos_item_id?: Types.ObjectId;

  /** Quantité consommée automatiquement par chambre au départ du client. */
  @Prop({ type: Number, min: 0, default: 0 })
  consumed_per_checkout!: number;

  @Prop({ type: Boolean, default: true, index: true })
  is_active!: boolean;
}

export const ProductSchema = SchemaFactory.createForClass(Product);

ProductSchema.index(
  { property_id: 1, sku: 1 },
  { unique: true, partialFilterExpression: { sku: { $type: 'string' } } },
);
ProductSchema.index({ property_id: 1, category: 1, is_active: 1 });
ProductSchema.index({ property_id: 1, consumed_per_checkout: 1 });
