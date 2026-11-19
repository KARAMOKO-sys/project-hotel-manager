import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { AuditableEntity } from '../../base-entities/embeddables/auditable.entity';
import { Currency } from '../../base-entities/enums/currency.enum';
import { VendorBillState } from '../purchase.utils';

export type VendorBillDocument = HydratedDocument<VendorBill>;

@Schema({ _id: false })
export class VendorBillLine {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Product' })
  product_id?: Types.ObjectId;

  @Prop({ type: String, required: true, maxlength: 300 })
  description!: string;

  @Prop({ type: Number, required: true, min: 0 })
  quantity!: number;

  @Prop({ type: Number, required: true, min: 0 })
  unit_price!: number;

  @Prop({ type: Number, min: 0, max: 100, default: 0 })
  tax_rate!: number;

  @Prop({ type: String, maxlength: 20 })
  account_code?: string;

  /** Index de la ligne du bon de commande facturée. */
  @Prop({ type: Number, min: 0 })
  purchase_line_index?: number;

  @Prop({ type: Number, default: 0 })
  amount_untaxed!: number;

  @Prop({ type: Number, default: 0 })
  tax_amount!: number;

  @Prop({ type: Number, default: 0 })
  amount_total!: number;
}
export const VendorBillLineSchema =
  SchemaFactory.createForClass(VendorBillLine);

/** Facture fournisseur (`FF/2026/00001`). */
@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'vendor_bills',
})
export class VendorBill extends AuditableEntity {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Property',
    required: true,
    index: true,
  })
  property_id!: Types.ObjectId;

  @Prop({ type: String, required: true, maxlength: 40 })
  number!: string;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Vendor',
    required: true,
    index: true,
  })
  vendor_id!: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'PurchaseOrder', index: true })
  purchase_order_id?: Types.ObjectId;

  /** Numéro de la facture chez le fournisseur. */
  @Prop({ type: String, trim: true, maxlength: 60 })
  vendor_reference?: string;

  @Prop({ type: Date, required: true })
  bill_date!: Date;

  @Prop({ type: Date, required: true, index: true })
  due_date!: Date;

  @Prop({ type: [VendorBillLineSchema], default: [] })
  lines!: VendorBillLine[];

  @Prop({ type: Number, default: 0 })
  amount_untaxed!: number;

  @Prop({ type: Number, default: 0 })
  tax_amount!: number;

  @Prop({ type: Number, default: 0 })
  amount_total!: number;

  @Prop({ type: String, enum: Object.values(Currency), default: Currency.XOF })
  currency!: Currency;

  @Prop({
    type: String,
    enum: Object.values(VendorBillState),
    default: VendorBillState.DRAFT,
    index: true,
  })
  state!: VendorBillState;

  @Prop({ type: String, maxlength: 1000 })
  notes?: string;

  @Prop({ type: String })
  created_by?: string;

  @Prop({ type: Date })
  posted_at?: Date;

  @Prop({ type: String })
  posted_by?: string;

  @Prop({ type: Date })
  paid_at?: Date;

  @Prop({ type: String })
  paid_by?: string;

  @Prop({ type: String, maxlength: 100 })
  payment_reference?: string;
}

export const VendorBillSchema = SchemaFactory.createForClass(VendorBill);

VendorBillSchema.index({ property_id: 1, number: 1 }, { unique: true });
VendorBillSchema.index({ property_id: 1, state: 1, due_date: 1 });
