import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { AuditableEntity } from '../../base-entities/embeddables/auditable.entity';
import {
  MoneyEmbeddable,
  MoneySchema,
} from '../../base-entities/embeddables/money.embeddable';
import { PaymentMethod } from '../../base-entities/enums/payment-method.enum';
import { PaymentStatus } from '../../base-entities/enums/payment-status.enum';

export type PaymentDocument = HydratedDocument<Payment>;

@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'payments',
})
export class Payment extends AuditableEntity {
  @Prop({
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
    maxlength: 30,
    index: true,
  })
  payment_number!: string;

  @Prop({ type: Types.ObjectId, ref: 'Invoice', index: true })
  invoice_id?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Reservation', index: true })
  reservation_id?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Guest', index: true })
  guest_id?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Property', index: true })
  property_id?: Types.ObjectId;

  @Prop({
    type: MoneySchema,
    required: true,
    default: () => ({ amount: 0, currency: 'XOF' }),
  })
  amount!: MoneyEmbeddable;

  @Prop({
    type: String,
    enum: Object.values(PaymentMethod),
    default: PaymentMethod.CASH,
  })
  method!: PaymentMethod;

  @Prop({
    type: String,
    enum: Object.values(PaymentStatus),
    default: PaymentStatus.PENDING,
    index: true,
  })
  status!: PaymentStatus;

  @Prop({
    type: String,
    trim: true,
    maxlength: 100,
    sparse: true,
    unique: true,
  })
  transaction_id?: string;

  @Prop({ type: String, trim: true, maxlength: 100 })
  reference?: string;

  @Prop({ type: Number, min: 0 })
  received_amount?: number;

  @Prop({ type: Number, min: 0, default: 0 })
  change_due!: number;

  @Prop({ type: Date })
  paid_at?: Date;

  @Prop({ type: String, maxlength: 500 })
  notes?: string;

  @Prop({ type: Object, default: () => ({}) })
  metadata!: Record<string, any>;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);

PaymentSchema.index({ reservation_id: 1, status: 1 });
PaymentSchema.index({ guest_id: 1 });
PaymentSchema.index({ property_id: 1, paid_at: 1 });
