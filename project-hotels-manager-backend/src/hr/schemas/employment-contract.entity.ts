import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { AuditableEntity } from '../../base-entities/embeddables/auditable.entity';
import { Currency } from '../../base-entities/enums/currency.enum';

export type EmploymentContractDocument = HydratedDocument<EmploymentContract>;

export enum ContractType {
  CDI = 'cdi',
  CDD = 'cdd',
  INTERIM = 'interim',
  INTERNSHIP = 'internship',
  DAILY_WORKER = 'daily_worker',
}

/** Types de contrat dont la date de fin est obligatoire. */
export const CONTRACT_TYPES_WITH_END: ContractType[] = [
  ContractType.CDD,
  ContractType.INTERNSHIP,
];

export enum WagePeriod {
  MONTHLY = 'monthly',
  HOURLY = 'hourly',
  DAILY = 'daily',
}

export enum ContractState {
  DRAFT = 'draft',
  RUNNING = 'running',
  EXPIRED = 'expired',
  TERMINATED = 'terminated',
}

/** Contrat de travail d'une affectation `Staff`. */
@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'hr_employment_contracts',
})
export class EmploymentContract extends AuditableEntity {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Property',
    required: true,
    index: true,
  })
  property_id!: Types.ObjectId;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Staff',
    required: true,
    index: true,
  })
  staff_id!: Types.ObjectId;

  /** Numéro `CT/2026/00001` attribué par `SequenceService`. */
  @Prop({ type: String, required: true, trim: true })
  reference!: string;

  @Prop({ type: String, enum: Object.values(ContractType), required: true })
  contract_type!: ContractType;

  @Prop({ type: Date, required: true })
  start_date!: Date;

  @Prop({ type: Date })
  end_date?: Date;

  @Prop({ type: Number, min: 0, required: true })
  wage!: number;

  @Prop({
    type: String,
    enum: Object.values(WagePeriod),
    default: WagePeriod.MONTHLY,
  })
  wage_period!: WagePeriod;

  @Prop({ type: String, enum: Object.values(Currency), default: Currency.XOF })
  currency!: Currency;

  @Prop({ type: Number, min: 0, max: 168, default: 40 })
  weekly_hours!: number;

  @Prop({
    type: String,
    enum: Object.values(ContractState),
    default: ContractState.DRAFT,
    index: true,
  })
  state!: ContractState;

  @Prop({ type: String, maxlength: 150 })
  job_title?: string;

  @Prop({ type: Date })
  terminated_at?: Date;

  @Prop({ type: String, maxlength: 500 })
  termination_reason?: string;

  @Prop({ type: String, maxlength: 2000 })
  notes?: string;
}

export const EmploymentContractSchema =
  SchemaFactory.createForClass(EmploymentContract);
// Un seul contrat en cours par employé (garanti aussi côté service).
EmploymentContractSchema.index(
  { staff_id: 1 },
  {
    unique: true,
    partialFilterExpression: {
      state: ContractState.RUNNING,
      is_deleted: false,
    },
    name: 'uniq_running_contract_per_staff',
  },
);
EmploymentContractSchema.index(
  { property_id: 1, reference: 1 },
  { unique: true },
);
EmploymentContractSchema.index({ state: 1, end_date: 1 });
