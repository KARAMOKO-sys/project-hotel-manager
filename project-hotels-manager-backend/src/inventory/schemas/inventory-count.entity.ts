import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { AuditableEntity } from '../../base-entities/embeddables/auditable.entity';
import { InventoryCountState } from '../inventory.enums';

export type InventoryCountDocument = HydratedDocument<InventoryCount>;

@Schema({ _id: false })
export class InventoryCountLine {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Product', required: true })
  product_id!: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'StockLocation', required: true })
  location_id!: Types.ObjectId;

  /** Quantité théorique (stock système), recalculée à l'application. */
  @Prop({ type: Number, default: 0 })
  theoretical_qty!: number;

  /** Quantité comptée ; une ligne non comptée est ignorée. */
  @Prop({ type: Number, min: 0 })
  counted_qty?: number;

  /** Écart appliqué (compté − théorique). */
  @Prop({ type: Number })
  difference?: number;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'StockMove' })
  move_id?: Types.ObjectId;

  /** Erreur rencontrée à l'application (la ligne n'a pas été ajustée). */
  @Prop({ type: String })
  error?: string;
}
export const InventoryCountLineSchema =
  SchemaFactory.createForClass(InventoryCountLine);

/** Inventaire physique : comptage puis ajustement des quantités. */
@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'inventory_counts',
})
export class InventoryCount extends AuditableEntity {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Property',
    required: true,
    index: true,
  })
  property_id!: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true, maxlength: 150 })
  name!: string;

  @Prop({ type: Date, default: Date.now })
  count_date!: Date;

  @Prop({ type: [InventoryCountLineSchema], default: [] })
  lines!: InventoryCountLine[];

  @Prop({
    type: String,
    enum: Object.values(InventoryCountState),
    default: InventoryCountState.DRAFT,
    index: true,
  })
  state!: InventoryCountState;

  @Prop({ type: Date })
  applied_at?: Date;

  @Prop({ type: String })
  applied_by?: string;

  @Prop({ type: String, maxlength: 500 })
  notes?: string;
}

export const InventoryCountSchema =
  SchemaFactory.createForClass(InventoryCount);
