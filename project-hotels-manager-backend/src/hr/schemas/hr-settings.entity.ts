import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { AuditableEntity } from '../../base-entities/embeddables/auditable.entity';
import { DEFAULT_WORKING_DAYS } from '../hr.utils';

export type HrSettingsDocument = HydratedDocument<HrSettings>;

@Schema({ _id: false })
export class PublicHoliday {
  /** Date `YYYY-MM-DD`. */
  @Prop({ type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ })
  date!: string;

  @Prop({ type: String, trim: true, maxlength: 150 })
  name?: string;
}
export const PublicHolidaySchema = SchemaFactory.createForClass(PublicHoliday);

/** Paramètres RH d'un établissement (semaine de travail, jours fériés). */
@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'hr_settings',
})
export class HrSettings extends AuditableEntity {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Property',
    required: true,
    index: true,
  })
  property_id!: Types.ObjectId;

  /** Jours ouvrés (0 = dimanche … 6 = samedi). Défaut : lundi → samedi. */
  @Prop({ type: [Number], default: () => [...DEFAULT_WORKING_DAYS] })
  working_days!: number[];

  @Prop({ type: [PublicHolidaySchema], default: [] })
  public_holidays!: PublicHoliday[];

  /** Horizon d'alerte des fins de contrat (jours). */
  @Prop({ type: Number, min: 1, max: 365, default: 30 })
  contract_expiry_alert_days!: number;
}

export const HrSettingsSchema = SchemaFactory.createForClass(HrSettings);
HrSettingsSchema.index(
  { property_id: 1 },
  { unique: true, name: 'uniq_hr_settings_property' },
);
