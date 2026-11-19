import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { AuditableEntity } from '../../base-entities/embeddables/auditable.entity';
import { Currency } from '../../base-entities/enums/currency.enum';

export type LeadDocument = HydratedDocument<Lead>;

export enum LeadType {
  LEAD = 'lead',
  OPPORTUNITY = 'opportunity',
}

export enum LeadSource {
  WEBSITE = 'website',
  PHONE = 'phone',
  EMAIL = 'email',
  WALK_IN = 'walk_in',
  PARTNER = 'partner',
  OTA = 'ota',
  SOCIAL = 'social',
  REFERRAL = 'referral',
}

export enum LeadSegment {
  GROUP = 'group',
  SEMINAR = 'seminar',
  WEDDING = 'wedding',
  CORPORATE_CONTRACT = 'corporate_contract',
  LONG_STAY = 'long_stay',
  INDIVIDUAL = 'individual',
}

export enum LeadState {
  OPEN = 'open',
  WON = 'won',
  LOST = 'lost',
}

/** Piste / opportunité commerciale (groupes, séminaires, mariages…). */
@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'crm_leads',
})
export class Lead extends AuditableEntity {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Property',
    required: true,
    index: true,
  })
  property_id!: Types.ObjectId;

  /** Numéro `PIS/2026/00001`. */
  @Prop({ type: String, required: true, trim: true })
  reference!: string;

  @Prop({ type: String, enum: Object.values(LeadType), default: LeadType.LEAD })
  lead_type!: LeadType;

  @Prop({ type: String, required: true, trim: true, maxlength: 200 })
  title!: string;

  @Prop({ type: String, trim: true, maxlength: 150 })
  contact_name?: string;

  @Prop({ type: String, trim: true, lowercase: true, maxlength: 200 })
  contact_email?: string;

  @Prop({ type: String, trim: true, maxlength: 50 })
  contact_phone?: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'CorporateAccount', index: true })
  corporate_account_id?: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Guest' })
  guest_id?: Types.ObjectId;

  @Prop({ type: String, enum: Object.values(LeadSource) })
  source?: LeadSource;

  @Prop({ type: String, enum: Object.values(LeadSegment) })
  segment?: LeadSegment;

  @Prop({ type: Date })
  arrival_date?: Date;

  @Prop({ type: Date })
  departure_date?: Date;

  @Prop({ type: Number, min: 0, default: 0 })
  rooms!: number;

  @Prop({ type: Number, min: 0, default: 0 })
  guests!: number;

  /** Calculé : chambres × nuits. */
  @Prop({ type: Number, min: 0, default: 0 })
  room_nights!: number;

  @Prop({ type: Number, min: 0, default: 0 })
  expected_revenue!: number;

  @Prop({ type: String, enum: Object.values(Currency), default: Currency.XOF })
  currency!: Currency;

  /** % ; reprend celle de l'étape, modifiable. */
  @Prop({ type: Number, min: 0, max: 100, default: 0 })
  probability!: number;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'CrmStage',
    required: true,
    index: true,
  })
  stage_id!: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', index: true })
  salesperson_id?: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(LeadState),
    default: LeadState.OPEN,
    index: true,
  })
  state!: LeadState;

  @Prop({ type: String, maxlength: 500 })
  lost_reason?: string;

  @Prop({ type: Date })
  won_at?: Date;

  @Prop({ type: Date })
  lost_at?: Date;

  @Prop({ type: Date })
  converted_at?: Date;

  @Prop({ type: [String], default: [] })
  tags!: string[];

  @Prop({ type: String, maxlength: 4000 })
  description?: string;
}

export const LeadSchema = SchemaFactory.createForClass(Lead);
LeadSchema.index({ property_id: 1, reference: 1 }, { unique: true });
LeadSchema.index({ property_id: 1, state: 1, stage_id: 1 });
LeadSchema.index({ property_id: 1, arrival_date: 1 });
