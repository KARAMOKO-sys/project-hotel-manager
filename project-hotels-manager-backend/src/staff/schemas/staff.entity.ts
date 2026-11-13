import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types, SchemaTypes } from 'mongoose';
import { AuditableEntity } from '../../base-entities/embeddables/auditable.entity';
import {
  MoneyEmbeddable,
  MoneySchema,
} from '../../base-entities/embeddables/money.embeddable';

export type StaffDocument = HydratedDocument<Staff>;

/**
 * Type de compte utilisateur rattaché à l'affectation.
 *
 * Reprend les profils internes de `UserType` et ajoute les rôles sans
 * collection dédiée (manager, maintenance).
 */
export enum StaffUserType {
  SUPER_ADMIN = 'super_admin',
  OWNER = 'owner',
  MANAGER = 'manager',
  RECEPTIONIST = 'receptionist',
  HOUSEKEEPING = 'housekeeping',
  ACCOUNTANT = 'accountant',
  MAINTENANCE = 'maintenance',
  OTHER = 'other',
}

/** Service (département) de l'établissement. */
export enum StaffDepartment {
  MANAGEMENT = 'management',
  FRONT_OFFICE = 'front_office',
  HOUSEKEEPING = 'housekeeping',
  MAINTENANCE = 'maintenance',
  ACCOUNTING = 'accounting',
  FOOD_BEVERAGE = 'food_beverage',
  SECURITY = 'security',
  OTHER = 'other',
}

/** Type de contrat. */
export enum EmploymentType {
  FULL_TIME = 'full_time',
  PART_TIME = 'part_time',
  CONTRACT = 'contract',
  INTERN = 'intern',
  SEASONAL = 'seasonal',
}

/** Statut de l'affectation. */
export enum EmploymentStatus {
  ACTIVE = 'active',
  ON_LEAVE = 'on_leave',
  SUSPENDED = 'suspended',
  TERMINATED = 'terminated',
}

/** Jours de la semaine utilisés dans le planning. */
export const STAFF_WEEK_DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

export type StaffWeekDay = (typeof STAFF_WEEK_DAYS)[number];

/** Créneau hebdomadaire de travail (`HH:mm`, peut passer minuit). */
@Schema({ _id: false })
export class StaffShift {
  @Prop({ type: String, enum: STAFF_WEEK_DAYS, required: true })
  day!: StaffWeekDay;

  @Prop({ type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ })
  start!: string;

  @Prop({ type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ })
  end!: string;
}

export const StaffShiftSchema = SchemaFactory.createForClass(StaffShift);

/** Contact à prévenir en cas d'urgence. */
@Schema({ _id: false })
export class StaffEmergencyContact {
  @Prop({ type: String, maxlength: 255, trim: true })
  name?: string;

  @Prop({ type: String, maxlength: 50, trim: true })
  phone?: string;

  @Prop({ type: String, maxlength: 100, trim: true })
  relationship?: string;
}

export const StaffEmergencyContactSchema = SchemaFactory.createForClass(
  StaffEmergencyContact,
);

/**
 * Affectation d'un utilisateur interne (employé) à une propriété.
 *
 * Fait le lien entre un compte utilisateur (réceptionniste, ménage,
 * comptable, manager...) et une propriété / organisation, avec les
 * informations RH : poste, service, contrat, statut, planning et hiérarchie.
 * Un utilisateur peut avoir plusieurs affectations (une par propriété).
 */
@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'staff',
})
export class Staff extends AuditableEntity {
  /** Compte utilisateur (collection dépendant de `user_type`). */
  @Prop({ type: SchemaTypes.ObjectId, required: true, index: true })
  user_id!: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(StaffUserType),
    required: true,
    index: true,
  })
  user_type!: StaffUserType;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Organization', index: true })
  organization_id?: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Property', required: true, index: true })
  property_id!: Types.ObjectId;

  /** Matricule interne, unique par propriété. */
  @Prop({ type: String, trim: true, maxlength: 50 })
  employee_code?: string;

  @Prop({ type: String, required: true, trim: true, maxlength: 100 })
  position!: string;

  @Prop({
    type: String,
    enum: Object.values(StaffDepartment),
    default: StaffDepartment.OTHER,
  })
  department!: StaffDepartment;

  @Prop({
    type: String,
    enum: Object.values(EmploymentType),
    default: EmploymentType.FULL_TIME,
  })
  employment_type!: EmploymentType;

  @Prop({
    type: String,
    enum: Object.values(EmploymentStatus),
    default: EmploymentStatus.ACTIVE,
  })
  employment_status!: EmploymentStatus;

  /** Raison du dernier changement de statut (congé, suspension, départ). */
  @Prop({ type: String, maxlength: 500 })
  status_reason?: string;

  @Prop({ type: Date })
  status_changed_at?: Date;

  @Prop({ type: Date, required: true, default: Date.now })
  hire_date!: Date;

  /** Date de fin de contrat / de départ. */
  @Prop({ type: Date })
  end_date?: Date;

  /** Responsable hiérarchique (autre affectation `Staff`). */
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Staff', index: true })
  manager_id?: Types.ObjectId;

  @Prop({ type: [StaffShiftSchema], default: [] })
  schedule!: StaffShift[];

  /** Heures hebdomadaires (calculées à partir du planning si fourni). */
  @Prop({ type: Number, min: 0, max: 168, default: 0 })
  weekly_hours!: number;

  @Prop({ type: MoneySchema })
  salary?: MoneyEmbeddable;

  @Prop({ type: StaffEmergencyContactSchema })
  emergency_contact?: StaffEmergencyContact;

  @Prop({ type: [String], default: [] })
  skills!: string[];

  @Prop({ type: String, maxlength: 1000 })
  notes?: string;

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, any>;
}

export const StaffSchema = SchemaFactory.createForClass(Staff);

// Recherche des affectations d'un utilisateur sur une propriété. L'unicité
// d'une affectation « en cours » (hors départ) est garantie par le service,
// afin de permettre une réembauche après un départ.
StaffSchema.index({ user_id: 1, property_id: 1 });
// Matricule unique au sein d'une propriété.
StaffSchema.index(
  { property_id: 1, employee_code: 1 },
  {
    unique: true,
    partialFilterExpression: {
      employee_code: { $type: 'string' },
      is_deleted: false,
    },
  },
);
StaffSchema.index({ property_id: 1, department: 1 });
StaffSchema.index({ property_id: 1, employment_status: 1 });
StaffSchema.index({ organization_id: 1, employment_status: 1 });
StaffSchema.index({ 'schedule.day': 1 });
