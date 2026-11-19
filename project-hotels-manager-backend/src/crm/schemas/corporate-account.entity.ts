import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { AuditableEntity } from '../../base-entities/embeddables/auditable.entity';
import { Currency } from '../../base-entities/enums/currency.enum';

export type CorporateAccountDocument = HydratedDocument<CorporateAccount>;

@Schema({ _id: false })
export class CorporateContact {
  @Prop({ type: String, required: true, trim: true, maxlength: 150 })
  name!: string;

  @Prop({ type: String, trim: true, lowercase: true, maxlength: 200 })
  email?: string;

  @Prop({ type: String, trim: true, maxlength: 50 })
  phone?: string;

  @Prop({ type: String, trim: true, maxlength: 100 })
  role?: string;
}
export const CorporateContactSchema =
  SchemaFactory.createForClass(CorporateContact);

/** Compte entreprise (contrat corporate, remise négociée, crédit). */
@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'crm_corporate_accounts',
})
export class CorporateAccount extends AuditableEntity {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Property',
    required: true,
    index: true,
  })
  property_id!: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true, maxlength: 200 })
  name!: string;

  /** Identifiant fiscal (NCC, IFU, NINEA…). */
  @Prop({ type: String, trim: true, maxlength: 50 })
  tax_id?: string;

  @Prop({ type: String, trim: true, maxlength: 100 })
  industry?: string;

  @Prop({ type: Number, min: 0, max: 100, default: 0 })
  negotiated_discount_percent!: number;

  @Prop({ type: Number, min: 0, default: 0 })
  credit_limit!: number;

  @Prop({ type: String, enum: Object.values(Currency), default: Currency.XOF })
  currency!: Currency;

  @Prop({ type: Number, min: 0, max: 365, default: 30 })
  payment_term_days!: number;

  @Prop({ type: [CorporateContactSchema], default: [] })
  contacts!: CorporateContact[];

  /** Commercial responsable (utilisateur). */
  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' })
  account_manager_id?: Types.ObjectId;

  @Prop({ type: Boolean, default: true })
  is_active!: boolean;

  @Prop({ type: String, maxlength: 2000 })
  notes?: string;
}

export const CorporateAccountSchema =
  SchemaFactory.createForClass(CorporateAccount);
CorporateAccountSchema.index({ property_id: 1, name: 1 });
