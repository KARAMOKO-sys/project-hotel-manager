import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { AuditableEntity } from '../../base-entities/embeddables/auditable.entity';
import { StockLocationType } from '../inventory.enums';

export type StockLocationDocument = HydratedDocument<StockLocation>;

/**
 * Emplacement de stock. Les emplacements `internal` (réserve, bar, économat)
 * portent des quantités ; les autres (fournisseurs, clients, pertes,
 * consommation) sont virtuels : ils servent de source ou de destination.
 */
@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'stock_locations',
})
export class StockLocation extends AuditableEntity {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Property',
    required: true,
    index: true,
  })
  property_id!: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true, maxlength: 120 })
  name!: string;

  @Prop({
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    maxlength: 30,
  })
  code!: string;

  @Prop({
    type: String,
    enum: Object.values(StockLocationType),
    required: true,
    index: true,
  })
  location_type!: StockLocationType;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'StockLocation' })
  parent_id?: Types.ObjectId;

  /** Emplacement par défaut de son type (ex. réception des achats). */
  @Prop({ type: Boolean, default: false })
  is_default!: boolean;

  @Prop({ type: Boolean, default: true })
  is_active!: boolean;
}

export const StockLocationSchema = SchemaFactory.createForClass(StockLocation);

StockLocationSchema.index({ property_id: 1, code: 1 }, { unique: true });
StockLocationSchema.index({ property_id: 1, location_type: 1, is_default: 1 });
