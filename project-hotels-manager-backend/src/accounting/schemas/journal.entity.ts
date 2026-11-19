import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { AuditableEntity } from '../../base-entities/embeddables/auditable.entity';
import { JournalType } from '../domain/accounting.enums';

export { JournalType };

export type JournalDocument = HydratedDocument<Journal>;

/**
 * Journal comptable (ventes, achats, caisse, banque, Mobile Money, OD).
 * Le code sert de préfixe de numérotation des écritures (`VTE/2026/00001`).
 */
@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'accounting_journals',
})
export class Journal extends AuditableEntity {
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
    uppercase: true,
    maxlength: 10,
    match: /^[A-Z0-9]{1,10}$/,
  })
  code!: string;

  @Prop({ type: String, required: true, trim: true, maxlength: 100 })
  name!: string;

  @Prop({
    type: String,
    enum: Object.values(JournalType),
    required: true,
    index: true,
  })
  type!: JournalType;

  /** Compte de contrepartie par défaut (trésorerie, ventes, achats). */
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Account' })
  default_account_id?: Types.ObjectId;

  @Prop({ type: Boolean, default: true, index: true })
  is_active!: boolean;
}

export const JournalSchema = SchemaFactory.createForClass(Journal);

JournalSchema.index(
  { property_id: 1, code: 1 },
  { unique: true, partialFilterExpression: { is_deleted: false } },
);
