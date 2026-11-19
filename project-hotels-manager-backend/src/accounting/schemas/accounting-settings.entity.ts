import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { AuditableEntity } from '../../base-entities/embeddables/auditable.entity';
import { Currency } from '../../base-entities/enums/currency.enum';
import {
  DEFAULT_ACCOUNT_MAPPING,
  DEFAULT_JOURNAL_MAPPING,
} from '../domain/syscohada-chart';

export type AccountingSettingsDocument = HydratedDocument<AccountingSettings>;

/** Codes des comptes de contrepartie utilisés par la comptabilisation automatique. */
@Schema({ _id: false, timestamps: false })
export class AccountMappingSettings {
  @Prop({ type: String, default: DEFAULT_ACCOUNT_MAPPING.receivable })
  receivable!: string;
  @Prop({ type: String, default: DEFAULT_ACCOUNT_MAPPING.payable })
  payable!: string;
  @Prop({
    type: String,
    default: DEFAULT_ACCOUNT_MAPPING.revenue_accommodation,
  })
  revenue_accommodation!: string;
  @Prop({ type: String, default: DEFAULT_ACCOUNT_MAPPING.revenue_fnb })
  revenue_fnb!: string;
  @Prop({ type: String, default: DEFAULT_ACCOUNT_MAPPING.revenue_other })
  revenue_other!: string;
  @Prop({ type: String, default: DEFAULT_ACCOUNT_MAPPING.tax_collected })
  tax_collected!: string;
  @Prop({ type: String, default: DEFAULT_ACCOUNT_MAPPING.tax_deductible })
  tax_deductible!: string;
  @Prop({ type: String, default: DEFAULT_ACCOUNT_MAPPING.cash }) cash!: string;
  @Prop({ type: String, default: DEFAULT_ACCOUNT_MAPPING.bank }) bank!: string;
  @Prop({ type: String, default: DEFAULT_ACCOUNT_MAPPING.mobile_money })
  mobile_money!: string;
  @Prop({ type: String, default: DEFAULT_ACCOUNT_MAPPING.purchases })
  purchases!: string;
  @Prop({
    type: String,
    default: DEFAULT_ACCOUNT_MAPPING.purchases_raw_materials,
  })
  purchases_raw_materials!: string;
  @Prop({ type: String, default: DEFAULT_ACCOUNT_MAPPING.purchases_supplies })
  purchases_supplies!: string;
  @Prop({ type: String, default: DEFAULT_ACCOUNT_MAPPING.purchases_other })
  purchases_other!: string;
  @Prop({ type: String, default: DEFAULT_ACCOUNT_MAPPING.stock })
  stock!: string;
  @Prop({ type: String, default: DEFAULT_ACCOUNT_MAPPING.salaries })
  salaries!: string;
  @Prop({ type: String, default: DEFAULT_ACCOUNT_MAPPING.social_charges })
  social_charges!: string;
  @Prop({ type: String, default: DEFAULT_ACCOUNT_MAPPING.bank_fees })
  bank_fees!: string;
  @Prop({ type: String, default: DEFAULT_ACCOUNT_MAPPING.suspense })
  suspense!: string;
}

export const AccountMappingSettingsSchema = SchemaFactory.createForClass(
  AccountMappingSettings,
);

/** Codes des journaux utilisés par la comptabilisation automatique. */
@Schema({ _id: false, timestamps: false })
export class JournalMappingSettings {
  @Prop({ type: String, default: DEFAULT_JOURNAL_MAPPING.sale }) sale!: string;
  @Prop({ type: String, default: DEFAULT_JOURNAL_MAPPING.purchase })
  purchase!: string;
  @Prop({ type: String, default: DEFAULT_JOURNAL_MAPPING.cash }) cash!: string;
  @Prop({ type: String, default: DEFAULT_JOURNAL_MAPPING.bank }) bank!: string;
  @Prop({ type: String, default: DEFAULT_JOURNAL_MAPPING.mobile_money })
  mobile_money!: string;
  @Prop({ type: String, default: DEFAULT_JOURNAL_MAPPING.general })
  general!: string;
}

export const JournalMappingSettingsSchema = SchemaFactory.createForClass(
  JournalMappingSettings,
);

/** Paramètres comptables d'un établissement (un document par établissement). */
@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'accounting_settings',
})
export class AccountingSettings extends AuditableEntity {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Property',
    required: true,
    unique: true,
  })
  property_id!: Types.ObjectId;

  /** Les écritures datées de ce jour ou avant ne peuvent plus être validées, contre-passées ni modifiées. */
  @Prop({ type: Date })
  lock_date?: Date;

  /** Comptabilisation automatique des factures, paiements, ventes POS et factures fournisseurs. */
  @Prop({ type: Boolean, default: true })
  auto_posting!: boolean;

  @Prop({ type: String, enum: Object.values(Currency), default: Currency.XOF })
  currency!: Currency;

  @Prop({ type: AccountMappingSettingsSchema, default: () => ({}) })
  accounts!: AccountMappingSettings;

  @Prop({ type: JournalMappingSettingsSchema, default: () => ({}) })
  journals!: JournalMappingSettings;
}

export const AccountingSettingsSchema =
  SchemaFactory.createForClass(AccountingSettings);
