import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { AuditableEntity } from '../../base-entities/embeddables/auditable.entity';
import { Currency } from '../../base-entities/enums/currency.enum';
import { BillingStatus, PurchaseOrderState } from '../purchase.utils';

export type PurchaseOrderDocument = HydratedDocument<PurchaseOrder>;

@Schema({ _id: false })
export class PurchaseOrderLine {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Product' })
  product_id?: Types.ObjectId;

  @Prop({ type: String, required: true, maxlength: 300 })
  description!: string;

  @Prop({ type: Number, required: true, min: 0 })
  quantity!: number;

  @Prop({ type: Number, required: true, min: 0 })
  unit_price!: number;

  /** Taux de taxe en pourcentage (ex. 18). */
  @Prop({ type: Number, min: 0, max: 100, default: 0 })
  tax_rate!: number;

  @Prop({ type: Number, min: 0, default: 0 })
  received_qty!: number;

  @Prop({ type: Number, min: 0, default: 0 })
  billed_qty!: number;

  /** Compte de charge (SYSCOHADA) proposé à la comptabilité. */
  @Prop({ type: String, maxlength: 20 })
  account_code?: string;

  @Prop({ type: Number, default: 0 })
  amount_untaxed!: number;

  @Prop({ type: Number, default: 0 })
  tax_amount!: number;

  @Prop({ type: Number, default: 0 })
  amount_total!: number;
}
export const PurchaseOrderLineSchema =
  SchemaFactory.createForClass(PurchaseOrderLine);

/** Bon de commande fournisseur (`BC/2026/00001`). */
@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'purchase_orders',
})
export class PurchaseOrder extends AuditableEntity {
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

  @Prop({ type: Date, default: Date.now })
  order_date!: Date;

  @Prop({ type: Date })
  expected_date?: Date;

  @Prop({ type: [PurchaseOrderLineSchema], default: [] })
  lines!: PurchaseOrderLine[];

  @Prop({ type: Number, default: 0 })
  amount_untaxed!: number;

  @Prop({ type: Number, default: 0 })
  amount_tax!: number;

  @Prop({ type: Number, default: 0 })
  amount_total!: number;

  @Prop({ type: String, enum: Object.values(Currency), default: Currency.XOF })
  currency!: Currency;

  @Prop({
    type: String,
    enum: Object.values(PurchaseOrderState),
    default: PurchaseOrderState.DRAFT,
    index: true,
  })
  state!: PurchaseOrderState;

  @Prop({
    type: String,
    enum: Object.values(BillingStatus),
    default: BillingStatus.NONE,
  })
  billing_status!: BillingStatus;

  /** Brouillon créé par le réapprovisionnement automatique. */
  @Prop({ type: Boolean, default: false })
  is_system_generated!: boolean;

  @Prop({ type: String, maxlength: 1000 })
  notes?: string;

  @Prop({ type: String })
  created_by?: string;

  @Prop({ type: Date })
  sent_at?: Date;

  @Prop({ type: Date })
  confirmed_at?: Date;

  @Prop({ type: String })
  confirmed_by?: string;

  @Prop({ type: Date })
  approved_at?: Date;

  @Prop({ type: String })
  approved_by?: string;

  @Prop({ type: Date })
  received_at?: Date;

  @Prop({ type: Date })
  cancelled_at?: Date;
}

export const PurchaseOrderSchema = SchemaFactory.createForClass(PurchaseOrder);

PurchaseOrderSchema.index({ property_id: 1, number: 1 }, { unique: true });
PurchaseOrderSchema.index({ property_id: 1, state: 1, order_date: -1 });
/** Un seul brouillon automatique par fournisseur et par établissement. */
PurchaseOrderSchema.index(
  { property_id: 1, vendor_id: 1 },
  {
    unique: true,
    partialFilterExpression: { state: 'draft', is_system_generated: true },
    name: 'unique_system_draft_per_vendor',
  },
);
