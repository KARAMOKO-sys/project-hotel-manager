// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/report/
// =============================================================================

import type { AuditableEntity } from "./base-entities";
import type { PaginationQueryDto } from "./common";

/** Définition d'un rapport. Pour les types `daily`, `monthly` et `annual`, la période peut être omise : elle est déduite de `reference_date` (par défaut aujourd'hui). */
export interface CreateReportDto {
  property_id: string;
  name: string;
  description?: string;
  type: ReportType;
  period_start?: string;
  period_end?: string;
  reference_date?: string;
  format?: ReportFormat;
  columns?: string[];
  metadata?: Record<string, unknown>;
}

/** Données tabulaires fournies pour générer le rapport. */
export interface GenerateReportDto {
  rows: Array<Record<string, unknown>>;
  columns?: string[];
  generated_by?: string;
}

/** Création et génération en une seule requête. */
export type CreateAndGenerateReportDto = CreateReportDto & GenerateReportDto;

export interface ScheduleReportDto {
  recurrence: ReportRecurrence;
  recipients?: string[];
  /** Première exécution (défaut : maintenant + une récurrence). */
  start_at?: string;
}

export interface ExportReportQueryDto {
  format?: ReportFormat;
}

export interface ReportFilterQueryDto extends PaginationQueryDto {
  type?: ReportType;
  status?: ReportStatus;
}

export interface DueReportsQueryDto {
  at?: string;
}

/** Mise à jour de la définition. Le statut, les données et la programmation évoluent via les routes `generate`, `schedule` et `unschedule`. */
export type UpdateReportDto = Partial<CreateReportDto>;

/** Nature du rapport. */
export enum ReportType {
  DAILY = "daily",
  MONTHLY = "monthly",
  ANNUAL = "annual",
  FINANCIAL = "financial",
  OCCUPANCY = "occupancy",
  REVENUE = "revenue",
  CUSTOM = "custom",
}

export enum ReportStatus {
  DRAFT = "draft",
  SCHEDULED = "scheduled",
  COMPLETED = "completed",
  FAILED = "failed",
}

/** Format d'export souhaité. */
export enum ReportFormat {
  PDF = "pdf",
  EXCEL = "excel",
  CSV = "csv",
  JSON = "json",
}

/** Récurrence d'un rapport programmé. */
export enum ReportRecurrence {
  DAILY = "daily",
  WEEKLY = "weekly",
  MONTHLY = "monthly",
  YEARLY = "yearly",
}

/** Programmation d'un rapport récurrent. */
export interface ReportSchedule {
  recurrence: ReportRecurrence;
  next_run_at?: string;
  last_run_at?: string;
  /** Adresses e-mail destinataires (l'envoi est assuré par le module notification). */
  recipients: string[];
  is_active: boolean;
}

/** Rapport (définition + dernier résultat généré). Les données sont fournies par l'appelant au moment de la génération (lignes tabulaires) ; le service calcule une synthèse et permet l'export. */
export interface Report extends AuditableEntity {
  property_id: string;
  name: string;
  description?: string;
  type: ReportType;
  period_start: string;
  period_end: string;
  status: ReportStatus;
  format: ReportFormat;
  /** Colonnes (ordre d'export). Déduites des lignes si absentes. */
  columns: string[];
  /** Données générées : `{ rows: [...] }`. */
  data: Record<string, unknown>;
  /** Synthèse calculée : nombre de lignes, totaux et moyennes numériques. */
  summary: Record<string, unknown>;
  generated_at?: string;
  generated_by?: string;
  generation_count: number;
  error_message?: string;
  schedule?: ReportSchedule;
  metadata: Record<string, unknown>;
}
