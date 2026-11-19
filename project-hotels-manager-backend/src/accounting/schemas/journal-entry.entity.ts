import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { AuditableEntity } from '../../base-entities/embeddables/auditable.entity';
import { Currency } from '../../base-entities/enums/currency.enum';
import { JournalEntryState, PartnerType } from '../domain/accounting.enums';

export { JournalEntryState, PartnerType };

export type JournalEntryDocument = HydratedDocument<JournalEntry>;

/** Ligne d'écriture : exactement un montant (débit ou crédit) > 0. */
@Schema({ _id: true, timestamps: false })
export class JournalEntryLine {
  _id?: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Account', required: true })
  account_id!: Types.ObjectId;

  /** Copie du code du compte au moment de la saisie (affichage). */
  @Prop({ type: String, trim: true, maxlength: 12 })
  account_code?: string;

  @Prop({ type: String, trim: true, maxlength: 250 })
  label?: string;

  @Prop({ type: Number, min: 0, default: 0 })
  debit!: number;

  @Prop({ type: Number, min: 0, default: 0 })
  credit!: number;

  @Prop({ type: String, enum: Object.values(PartnerType) })
  partner_type?: PartnerType;

  @Prop({ type: SchemaTypes.ObjectId })
  partner_id?: Types.ObjectId;
}

export const JournalEntryLineSchema =
  SchemaFactory.createForClass(JournalEntryLine);

/** Document métier à l'origine d'une écriture automatique (idempotence). */
@Schema({ _id: false, timestamps: false })
export class JournalEntrySource {
  /** Modèle d'origine (`Invoice`, `Payment`, `PosTransaction`, `VendorBill`). */
  @Prop({ type: String, required: true })
  model!: string;

  @Prop({ type: String, required: true })
  id!: string;

  /** Nom de l'événement métier traité. */
  @Prop({ type: String, required: true })
  event!: string;
}

export const JournalEntrySourceSchema =
  SchemaFactory.createForClass(JournalEntrySource);

/**
 * Écriture comptable (pièce). Brouillon modifiable, puis validée (immuable,
 * numérotée) ; une écriture validée ne se corrige que par contre-passation.
 */
@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'accounting_journal_entries',
})
export class JournalEntry extends AuditableEntity {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Property',
    required: true,
    index: true,
  })
  property_id!: Types.ObjectId;

  /** Numéro attribué à la validation uniquement (`VTE/2026/00001`). */
  @Prop({ type: String, trim: true, maxlength: 40 })
  number?: string;

  @Prop({ type: Date, required: true, index: true })
  date!: Date;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Journal',
    required: true,
    index: true,
  })
  journal_id!: Types.ObjectId;

  /** Copie du code du journal (affichage et numérotation). */
  @Prop({ type: String, trim: true, maxlength: 10 })
  journal_code?: string;

  @Prop({ type: String, trim: true, maxlength: 100 })
  reference?: string;

  @Prop({ type: String, trim: true, maxlength: 1000 })
  narration?: string;

  @Prop({ type: [JournalEntryLineSchema], default: [] })
  lines!: JournalEntryLine[];

  @Prop({
    type: String,
    enum: Object.values(JournalEntryState),
    default: JournalEntryState.DRAFT,
    index: true,
  })
  state!: JournalEntryState;

  @Prop({ type: Number, min: 0, default: 0 })
  total_debit!: number;

  @Prop({ type: Number, min: 0, default: 0 })
  total_credit!: number;

  /** Devise (code ISO, ex. XOF) ; libre pour accepter les devises des documents d'origine. */
  @Prop({ type: String, default: Currency.XOF, uppercase: true, maxlength: 3 })
  currency!: string;

  @Prop({ type: JournalEntrySourceSchema, default: undefined })
  source?: JournalEntrySource;

  /** Écriture de contre-passation de celle-ci. */
  @Prop({ type: SchemaTypes.ObjectId, ref: 'JournalEntry' })
  reversed_entry_id?: Types.ObjectId;

  /** Écriture contre-passée par celle-ci. */
  @Prop({ type: SchemaTypes.ObjectId, ref: 'JournalEntry' })
  reversal_of_id?: Types.ObjectId;

  @Prop({ type: Date })
  posted_at?: Date;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' })
  posted_by?: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' })
  created_by?: Types.ObjectId;
}

export const JournalEntrySchema = SchemaFactory.createForClass(JournalEntry);

JournalEntrySchema.index({ property_id: 1, state: 1, date: 1 });
JournalEntrySchema.index({
  property_id: 1,
  'lines.account_id': 1,
  state: 1,
  date: 1,
});
JournalEntrySchema.index(
  { property_id: 1, number: 1 },
  { unique: true, partialFilterExpression: { number: { $type: 'string' } } },
);
/** Idempotence de la comptabilisation automatique. */
JournalEntrySchema.index(
  { 'source.model': 1, 'source.id': 1, 'source.event': 1 },
  { unique: true, sparse: true },
);
