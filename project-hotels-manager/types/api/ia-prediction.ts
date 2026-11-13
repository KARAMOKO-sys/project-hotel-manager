// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/ia-prediction/
// =============================================================================

import type { AuditableEntity } from "./base-entities";
import type { PaginationQueryDto } from "./common";

/** Enregistrement manuel d'une prédiction (ou import depuis un système externe). */
export interface CreateIaPredictionDto {
  property_id: string;
  type: PredictionType;
  target: string;
  target_id?: string;
  target_date: string;
  horizon_days?: number;
  predicted_value: number;
  lower_bound?: number;
  upper_bound?: number;
  confidence?: number;
  method?: ForecastMethod;
  model_version?: string;
  metadata?: Record<string, unknown>;
}

/** Demande de prévision à partir d'un historique journalier fourni par l'appelant (du plus ancien au plus récent). */
export interface ForecastDto {
  property_id: string;
  type: PredictionType;
  target: string;
  target_id?: string;
  history: number[];
  /** Nombre de jours à prévoir (défaut 7). */
  horizon?: number;
  method?: ForecastMethod;
  window?: number;
  /** Date du premier point prévu (défaut : demain). */
  start_date?: string;
  min_value?: number;
  max_value?: number;
  /** `false` pour un simple aperçu sans enregistrement. */
  persist?: boolean;
}

export interface RecordActualDto {
  actual_value: number;
}

export interface PredictionFilterQueryDto extends PaginationQueryDto {
  type?: PredictionType;
  status?: PredictionStatus;
}

export interface AccuracyQueryDto {
  property_id?: string;
  type?: PredictionType;
  method?: ForecastMethod;
  model_version?: string;
  from?: string;
  to?: string;
}

export interface PendingEvaluationQueryDto {
  limit?: number;
}

/** La valeur réelle s'enregistre via la route dédiée `PATCH :id/actual`. */
export type UpdateIaPredictionDto = Partial<CreateIaPredictionDto>;

export interface ForecastPoint {
  /** Pas de temps (1 = la période suivant le dernier point d'historique). */
  step: number;
  value: number;
  lower: number;
  upper: number;
}

export interface ForecastResult {
  method: ForecastMethod;
  confidence: number;
  points: ForecastPoint[];
  summary: { history_length: number; mean: number; slope: null | number; residual_std: number; seasonal_indices: null | number[] };
}

export interface AccuracyMetrics {
  count: number;
  /** Erreur absolue moyenne. */
  mae: null | number;
  /** Erreur absolue moyenne en pourcentage (paires à valeur réelle nulle exclues). */
  mape: null | number;
  /** Précision = 100 - MAPE (bornée à 0). */
  accuracy: null | number;
}

/** Grandeur prédite. */
export enum PredictionType {
  DEMAND = "demand",
  OCCUPANCY = "occupancy",
  PRICE = "price",
  REVENUE = "revenue",
  CHURN = "churn",
  MAINTENANCE = "maintenance",
}

/** Méthode de prévision utilisée. */
export enum ForecastMethod {
  MOVING_AVERAGE = "moving_average",
  LINEAR_TREND = "linear_trend",
  SEASONAL_TREND = "seasonal_trend",
  MANUAL = "manual",
}

export enum PredictionStatus {
  PENDING = "pending",
  EVALUATED = "evaluated",
}

/** Prédiction produite par le moteur de prévision (ou importée), conservée pour suivre sa précision une fois la valeur réelle connue. */
export interface IaPrediction extends AuditableEntity {
  property_id: string;
  type: PredictionType;
  /** Cible lisible : `property`, `room_type`, `guest`, `equipment`… */
  target: string;
  /** Identifiant de la cible (type de chambre, client, équipement…). */
  target_id?: string;
  /** Date concernée par la prédiction. */
  target_date: string;
  /** Horizon en jours entre la génération et la date cible. */
  horizon_days: number;
  predicted_value: number;
  lower_bound?: number;
  upper_bound?: number;
  confidence: number;
  method: ForecastMethod;
  model_version: string;
  /** Résumé des données d'entrée (taille de l'historique, pente…). */
  input_summary: Record<string, unknown>;
  status: PredictionStatus;
  actual_value?: number;
  actual_recorded_at?: string;
  absolute_error?: number;
  /** Erreur relative en % (absente si la valeur réelle vaut 0). */
  percentage_error?: number;
  metadata: Record<string, unknown>;
}

export interface ForecastResponse extends ForecastResult {
  /** Date associée à chaque point (même ordre que `points`). */
  target_dates: string[];
  /** Prédictions enregistrées (vide si `persist = false`). */
  predictions: IaPrediction[];
}

export interface AccuracyReport extends AccuracyMetrics {
  by_type: { demand?: AccuracyMetrics; occupancy?: AccuracyMetrics; price?: AccuracyMetrics; revenue?: AccuracyMetrics; churn?: AccuracyMetrics; maintenance?: AccuracyMetrics };
}
