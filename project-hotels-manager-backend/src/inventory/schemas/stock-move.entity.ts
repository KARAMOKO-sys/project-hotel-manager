import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { AuditableEntity } from '../../base-entities/embeddables/auditable.entity';
import { StockMoveState } from '../inventory.enums';

export type StockMoveDocument = HydratedDocument<StockMove>;

/** Document à l'origine d'un mouvement (bon de commande, réservation…). */
@Schema({ _id: false })
export class StockMoveOrigin {
  @Prop({ type: String, required: true, maxlength: 60 })
  model!: string;

  @Prop({ type: String, required: true, maxlength: 60 })
  id!: string;
}
export const StockMoveOriginSchema =
  SchemaFactory.createForClass(StockMoveOrigin);

/** Mouvement de stock d'un emplacement source vers une destination. */
@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'stock_moves',
})
export class StockMove extends AuditableEntity {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Property',
    required: true,
    index: true,
  })
  property_id!: Types.ObjectId;

  /** Numéro séquentiel `MV/2026/00001`. */
  @Prop({ type: String, required: true, maxlength: 40 })
  reference!: string;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Product',
    required: true,
    index: true,
  })
  product_id!: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 0 })
  quantity!: number;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'StockLocation', required: true })
  source_location_id!: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'StockLocation', required: true })
  dest_location_id!: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(StockMoveState),
    default: StockMoveState.DRAFT,
    index: true,
  })
  state!: StockMoveState;

  /** Coût unitaire valorisé (coût d'achat pour une réception). */
  @Prop({ type: Number, min: 0, default: 0 })
  unit_cost!: number;

  @Prop({ type: StockMoveOriginSchema })
  origin?: StockMoveOrigin;

  /**
   * Clé d'idempotence (ex. `checkout:<réservation>:<article>`) : empêche
   * qu'un événement rejoué crée deux fois le même mouvement.
   */
  @Prop({ type: String, maxlength: 200 })
  idempotency_key?: string;

  @Prop({ type: String, maxlength: 500 })
  notes?: string;

  @Prop({ type: Date })
  done_at?: Date;

  @Prop({ type: String })
  done_by?: string;

  @Prop({ type: String })
  created_by?: string;
}

export const StockMoveSchema = SchemaFactory.createForClass(StockMove);

StockMoveSchema.index({ property_id: 1, reference: 1 }, { unique: true });
StockMoveSchema.index(
  { idempotency_key: 1 },
  {
    unique: true,
    partialFilterExpression: { idempotency_key: { $type: 'string' } },
  },
);
StockMoveSchema.index({ property_id: 1, state: 1, done_at: -1 });
StockMoveSchema.index({ 'origin.model': 1, 'origin.id': 1 });
