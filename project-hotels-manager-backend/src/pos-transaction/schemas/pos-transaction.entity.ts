import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types, SchemaTypes } from 'mongoose';
import { AuditableEntity } from '../../base-entities/embeddables/auditable.entity';
import { Currency } from '../../base-entities/embeddables/money.embeddable';
import { PaymentMethod } from '../../base-entities/enums/payment-method.enum';
import { PosCategory } from '../../pos-item/schemas/pos-item.entity';

export type PosTransactionDocument = HydratedDocument<PosTransaction>;

/** Cycle de vie d'une transaction POS. */
export enum PosTransactionStatus {
  COMPLETED = 'completed',
  VOIDED = 'voided',
  PARTIALLY_REFUNDED = 'partially_refunded',
  REFUNDED = 'refunded',
}

/** Mode de règlement : imputation sur la chambre/réservation ou paiement direct. */
export enum PosSettlementType {
  ROOM_CHARGE = 'room_charge',
  DIRECT = 'direct',
}

/** Ligne d'article d'une transaction (copie figée des données catalogue). */
@Schema({ _id: true, timestamps: false })
export class PosTransactionLine {
  _id?: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'PosItem', required: true })
  item_id!: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true, maxlength: 150 })
  name!: string;

  @Prop({ type: String, enum: Object.values(PosCategory), required: true })
  category!: PosCategory;

  @Prop({ type: Number, required: true, min: 1 })
  quantity!: number;

  @Prop({ type: Number, required: true, min: 0 })
  unit_price!: number;

  @Prop({ type: Number, min: 0, max: 100, default: 0 })
  tax_rate!: number;

  /** Remise appliquée sur la ligne (montant). */
  @Prop({ type: Number, min: 0, default: 0 })
  discount!: number;

  /** Montant de taxe de la ligne. */
  @Prop({ type: Number, min: 0, default: 0 })
  tax_amount!: number;

  /** Total TTC de la ligne. */
  @Prop({ type: Number, min: 0, required: true })
  total!: number;
}

export const PosTransactionLineSchema =
  SchemaFactory.createForClass(PosTransactionLine);

/**
 * Transaction de point de vente (bar, spa, activités, blanchisserie…).
 * Elle est soit imputée à une réservation (note de chambre), soit réglée
 * directement.
 */
@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'pos_transactions',
})
export class PosTransaction extends AuditableEntity {
  @Prop({
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
    maxlength: 40,
    index: true,
  })
  transaction_number!: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Property', required: true, index: true })
  property_id!: Types.ObjectId;

  /** Point de vente (outlet) à l'origine de la vente. */
  @Prop({ type: String, enum: Object.values(PosCategory), index: true })
  outlet?: PosCategory;

  @Prop({ type: [PosTransactionLineSchema], default: [] })
  items!: PosTransactionLine[];

  @Prop({ type: String, default: Currency.XOF, uppercase: true, maxlength: 3 })
  currency!: string;

  @Prop({ type: Number, min: 0, default: 0 })
  subtotal!: number;

  @Prop({ type: Number, min: 0, default: 0 })
  discount_total!: number;

  @Prop({ type: Number, min: 0, default: 0 })
  tax_total!: number;

  @Prop({ type: Number, min: 0, default: 0 })
  total!: number;

  @Prop({
    type: String,
    enum: Object.values(PosSettlementType),
    required: true,
    index: true,
  })
  settlement_type!: PosSettlementType;

  @Prop({ type: String, enum: Object.values(PaymentMethod) })
  payment_method?: PaymentMethod;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Reservation', index: true })
  reservation_id?: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Guest', index: true })
  guest_id?: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Room', index: true })
  room_id?: Types.ObjectId;

  /** Facture sur laquelle la charge chambre a été reportée. */
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Invoice', index: true })
  invoice_id?: Types.ObjectId;

  /** Vrai lorsqu'une charge chambre a été reportée sur une facture. */
  @Prop({ type: Boolean, default: false })
  is_settled!: boolean;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' })
  cashier_id?: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(PosTransactionStatus),
    default: PosTransactionStatus.COMPLETED,
    index: true,
  })
  status!: PosTransactionStatus;

  @Prop({ type: Date, default: Date.now, index: true })
  transaction_date!: Date;

  @Prop({ type: Date })
  voided_at?: Date;

  @Prop({ type: String, maxlength: 500 })
  void_reason?: string;

  @Prop({ type: Number, min: 0, default: 0 })
  refunded_amount!: number;

  @Prop({ type: Date })
  refunded_at?: Date;

  @Prop({ type: String, maxlength: 500 })
  refund_reason?: string;

  @Prop({ type: String, maxlength: 500 })
  notes?: string;

  @Prop({ type: Object, default: () => ({}) })
  metadata!: Record<string, any>;
}

export const PosTransactionSchema =
  SchemaFactory.createForClass(PosTransaction);

PosTransactionSchema.index({ property_id: 1, transaction_date: -1 });
PosTransactionSchema.index({ reservation_id: 1, status: 1 });
PosTransactionSchema.index({ guest_id: 1, transaction_date: -1 });
PosTransactionSchema.index({ 'items.item_id': 1 });
