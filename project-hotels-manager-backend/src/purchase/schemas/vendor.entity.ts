import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { AuditableEntity } from '../../base-entities/embeddables/auditable.entity';
import { Currency } from '../../base-entities/enums/currency.enum';

export type VendorDocument = HydratedDocument<Vendor>;

@Schema({ _id: false })
export class VendorContact {
  @Prop({ type: String, trim: true, maxlength: 120 })
  name?: string;

  @Prop({ type: String, trim: true, lowercase: true, maxlength: 200 })
  email?: string;

  @Prop({ type: String, trim: true, maxlength: 40 })
  phone?: string;
}
export const VendorContactSchema = SchemaFactory.createForClass(VendorContact);

/** Fournisseur d'un établissement. */
@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'vendors',
})
export class Vendor extends AuditableEntity {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Property',
    required: true,
    index: true,
  })
  property_id!: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true, maxlength: 150 })
  name!: string;

  /** Code fournisseur (unique par établissement lorsqu'il est renseigné). */
  @Prop({ type: String, trim: true, uppercase: true, maxlength: 30 })
  code?: string;

  @Prop({ type: VendorContactSchema, default: () => ({}) })
  contact!: VendorContact;

  @Prop({ type: String, maxlength: 500 })
  address?: string;

  /** Identifiant fiscal (NCC, IFU, NINEA…). */
  @Prop({ type: String, trim: true, maxlength: 60 })
  tax_id?: string;

  /** Délai de paiement en jours (échéance = date de facture + délai). */
  @Prop({ type: Number, min: 0, default: 30 })
  payment_term_days!: number;

  @Prop({ type: String, enum: Object.values(Currency), default: Currency.XOF })
  currency!: Currency;

  @Prop({ type: Boolean, default: true, index: true })
  is_active!: boolean;
}

export const VendorSchema = SchemaFactory.createForClass(Vendor);

VendorSchema.index(
  { property_id: 1, code: 1 },
  { unique: true, partialFilterExpression: { code: { $type: 'string' } } },
);
VendorSchema.index({ property_id: 1, name: 1 });
