import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { AuditableEntity } from '../../base-entities/embeddables/auditable.entity';
import { AccountType } from '../domain/accounting.enums';

export { AccountType };

export type AccountDocument = HydratedDocument<Account>;

/**
 * Compte du plan comptable SYSCOHADA d'un établissement.
 * `syscohada_class` (1–9) est déduite du premier chiffre du code.
 */
@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'accounting_accounts',
})
export class Account extends AuditableEntity {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Property',
    required: true,
    index: true,
  })
  property_id!: Types.ObjectId;

  @Prop({
    type: String,
    required: true,
    trim: true,
    maxlength: 12,
    match: /^[1-9][0-9]{1,11}$/,
  })
  code!: string;

  @Prop({ type: String, required: true, trim: true, maxlength: 150 })
  name!: string;

  @Prop({
    type: String,
    enum: Object.values(AccountType),
    required: true,
    index: true,
  })
  account_type!: AccountType;

  @Prop({ type: Number, required: true, min: 1, max: 9 })
  syscohada_class!: number;

  /** Compte lettrable (tiers : clients, fournisseurs). */
  @Prop({ type: Boolean, default: false })
  reconcilable!: boolean;

  @Prop({ type: Boolean, default: true, index: true })
  is_active!: boolean;

  @Prop({ type: String, maxlength: 500 })
  description?: string;
}

export const AccountSchema = SchemaFactory.createForClass(Account);

AccountSchema.index(
  { property_id: 1, code: 1 },
  { unique: true, partialFilterExpression: { is_deleted: false } },
);
AccountSchema.index({ property_id: 1, syscohada_class: 1 });
