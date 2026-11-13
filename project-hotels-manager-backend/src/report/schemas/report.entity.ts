import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types, SchemaTypes } from 'mongoose';
import { AuditableEntity } from '../../base-entities/embeddables/auditable.entity';

export type ReportDocument = HydratedDocument<Report>;

/** Nature du rapport. */
export enum ReportType {
  DAILY = 'daily',
  MONTHLY = 'monthly',
  ANNUAL = 'annual',
  FINANCIAL = 'financial',
  OCCUPANCY = 'occupancy',
  REVENUE = 'revenue',
  CUSTOM = 'custom',
}

export enum ReportStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/** Format d'export souhaité. */
export enum ReportFormat {
  PDF = 'pdf',
  EXCEL = 'excel',
  CSV = 'csv',
  JSON = 'json',
}

/** Récurrence d'un rapport programmé. */
export enum ReportRecurrence {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

/** Programmation d'un rapport récurrent. */
@Schema({ _id: false })
export class ReportSchedule {
  @Prop({
    type: String,
    enum: Object.values(ReportRecurrence),
    required: true,
  })
  recurrence!: ReportRecurrence;

  @Prop({ type: Date })
  next_run_at?: Date;

  @Prop({ type: Date })
  last_run_at?: Date;

  /** Adresses e-mail destinataires (l'envoi est assuré par le module notification). */
  @Prop({ type: [String], default: [] })
  recipients!: string[];

  @Prop({ type: Boolean, default: true })
  is_active!: boolean;
}

export const ReportScheduleSchema =
  SchemaFactory.createForClass(ReportSchedule);

/**
 * Rapport (définition + dernier résultat généré).
 *
 * Les données sont fournies par l'appelant au moment de la génération
 * (lignes tabulaires) ; le service calcule une synthèse et permet l'export.
 */
@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'reports',
})
export class Report extends AuditableEntity {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Property', required: true, index: true })
  property_id!: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true, maxlength: 200 })
  name!: string;

  @Prop({ type: String, maxlength: 1000 })
  description?: string;

  @Prop({
    type: String,
    enum: Object.values(ReportType),
    required: true,
    index: true,
  })
  type!: ReportType;

  @Prop({ type: Date, required: true })
  period_start!: Date;

  @Prop({ type: Date, required: true })
  period_end!: Date;

  @Prop({
    type: String,
    enum: Object.values(ReportStatus),
    default: ReportStatus.DRAFT,
    index: true,
  })
  status!: ReportStatus;

  @Prop({
    type: String,
    enum: Object.values(ReportFormat),
    default: ReportFormat.CSV,
  })
  format!: ReportFormat;

  /** Colonnes (ordre d'export). Déduites des lignes si absentes. */
  @Prop({ type: [String], default: [] })
  columns!: string[];

  /** Données générées : `{ rows: [...] }`. */
  @Prop({ type: Object, default: () => ({}) })
  data!: Record<string, any>;

  /** Synthèse calculée : nombre de lignes, totaux et moyennes numériques. */
  @Prop({ type: Object, default: () => ({}) })
  summary!: Record<string, any>;

  @Prop({ type: Date })
  generated_at?: Date;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' })
  generated_by?: Types.ObjectId;

  @Prop({ type: Number, min: 0, default: 0 })
  generation_count!: number;

  @Prop({ type: String, maxlength: 1000 })
  error_message?: string;

  @Prop({ type: ReportScheduleSchema })
  schedule?: ReportSchedule;

  @Prop({ type: Object, default: () => ({}) })
  metadata!: Record<string, any>;
}

export const ReportSchema = SchemaFactory.createForClass(Report);

ReportSchema.index({ property_id: 1, type: 1, period_start: -1 });
ReportSchema.index({ 'schedule.is_active': 1, 'schedule.next_run_at': 1 });
