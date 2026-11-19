import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

export type StockQuantDocument = HydratedDocument<StockQuant>;

/**
 * Quantité en stock d'un article dans un emplacement interne.
 * Modifiée UNIQUEMENT par la validation des mouvements (`$inc` atomique).
 */
@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'stock_quants',
})
export class StockQuant {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Property',
    required: true,
    index: true,
  })
  property_id!: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Product', required: true })
  product_id!: Types.ObjectId;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'StockLocation',
    required: true,
    index: true,
  })
  location_id!: Types.ObjectId;

  @Prop({ type: Number, required: true, default: 0 })
  quantity!: number;
}

export const StockQuantSchema = SchemaFactory.createForClass(StockQuant);

StockQuantSchema.index({ product_id: 1, location_id: 1 }, { unique: true });
StockQuantSchema.index({ property_id: 1, product_id: 1 });
