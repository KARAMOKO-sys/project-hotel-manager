import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { AuditableEntity } from '../../base-entities/embeddables/auditable.entity';
import { InvoiceStatus } from '../../base-entities/enums/invoice-status.enum';

export type InvoiceDocument = HydratedDocument<Invoice>;

@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'invoices',
})
export class Invoice extends AuditableEntity {
  @Prop({
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
    maxlength: 30,
    index: true,
  })
  invoice_number!: string;

  @Prop({ type: Types.ObjectId, ref: 'Reservation', index: true })
  reservation_id?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Guest', index: true })
  guest_id?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Property', index: true })
  property_id?: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(InvoiceStatus),
    default: InvoiceStatus.DRAFT,
    index: true,
  })
  status!: InvoiceStatus;

  @Prop({ type: Date, default: Date.now })
  issue_date!: Date;

  @Prop({ type: Date })
  due_date?: Date;

  @Prop({ type: Number, min: 0, default: 0 })
  subtotal!: number;

  @Prop({ type: Number, min: 0, default: 0 })
  tax_amount!: number;

  @Prop({ type: Number, min: 0, default: 0 })
  discount_amount!: number;

  @Prop({ type: Number, min: 0, default: 0 })
  total_amount!: number;

  @Prop({ type: String, default: 'XOF', uppercase: true, maxlength: 3 })
  currency!: string;

  @Prop({ type: String, maxlength: 500 })
  notes?: string;
}

export const InvoiceSchema = SchemaFactory.createForClass(Invoice);

InvoiceSchema.index({ guest_id: 1, status: 1 });
InvoiceSchema.index({ property_id: 1, status: 1 });
InvoiceSchema.index({ issue_date: 1 });
