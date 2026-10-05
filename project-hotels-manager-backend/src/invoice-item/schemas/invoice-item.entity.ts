import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { AuditableEntity } from '../../base-entities/embeddables/auditable.entity';

export type InvoiceItemDocument = HydratedDocument<InvoiceItem>;

/**
 * Ligne de facture rattachée à une facture.
 */
@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'invoice_items',
})
export class InvoiceItem extends AuditableEntity {
  @Prop({ type: Types.ObjectId, ref: 'Invoice', required: true, index: true })
  invoice_id!: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true, maxlength: 255 })
  description!: string;

  @Prop({ type: Number, min: 1, default: 1 })
  quantity!: number;

  @Prop({ type: Number, min: 0, required: true })
  unit_price!: number;

  @Prop({ type: Number, min: 0, default: 0 })
  total!: number;

  @Prop({ type: Number, min: 0, default: 0 })
  tax_rate!: number;

  @Prop({ type: Number, min: 0, default: 0 })
  sort_order!: number;
}

export const InvoiceItemSchema = SchemaFactory.createForClass(InvoiceItem);

InvoiceItemSchema.index({ invoice_id: 1, sort_order: 1 });
