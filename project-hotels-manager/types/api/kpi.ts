// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/kpi/
// =============================================================================

import type { AuditableEntity, Currency } from "./base-entities";
import type { PaginationQueryDto } from "./common";

/** Données brutes nécessaires au calcul des indicateurs. */
export interface KpiInputDto {
  rooms_available: number;
  rooms_sold: number;
  room_revenue: number;
  total_revenue?: number;
  /** Peut être négatif (exploitation déficitaire). */
  gross_operating_profit?: number;
  reservations_count?: number;
  cancellations_count?: number;
  stays_count?: number;
}

/** Création d'un instantané : les indicateurs sont calculés côté serveur. */
export interface CreateKpiDto extends KpiInputDto {
  property_id: string;
  period_type: KpiPeriodType;
  period_start: string;
  period_end: string;
  currency?: Currency;
  guests_count?: number;
  metadata?: Record<string, unknown>;
}

/** Comparaison de deux périodes fournies en entrée (sans persistance). */
export interface ComparePeriodsDto {
  current: KpiInputDto;
  previous: KpiInputDto;
}

export interface KpiFilterQueryDto extends PaginationQueryDto {
  period_type?: KpiPeriodType;
}

export interface KpiLatestQueryDto {
  period_type?: KpiPeriodType;
}

export interface KpiTrendQueryDto {
  metric: KpiMetric;
  period_type?: KpiPeriodType;
  from?: string;
  to?: string;
}

/** Mise à jour des données brutes : les indicateurs sont recalculés. */
export type UpdateKpiDto = Partial<CreateKpiDto>;

export interface KpiMetrics {
  occupancy_rate: number;
  adr: number;
  revpar: number;
  trevpar: number;
  goppar: null | number;
  cancellation_rate: number;
  average_length_of_stay: number;
}

export interface MetricVariation {
  current: null | number;
  previous: null | number;
  absolute: null | number;
  /** Variation relative en % (null si la valeur précédente est 0 ou absente). */
  percent: null | number;
  trend: null | "stable" | "up" | "down";
}

/** Granularité de la période couverte par un instantané de KPI. */
export enum KpiPeriodType {
  DAILY = "daily",
  WEEKLY = "weekly",
  MONTHLY = "monthly",
  YEARLY = "yearly",
  CUSTOM = "custom",
}

/** Indicateurs calculés pouvant être suivis en tendance / comparaison. */
export enum KpiMetric {
  OCCUPANCY_RATE = "occupancy_rate",
  ADR = "adr",
  REVPAR = "revpar",
  TREVPAR = "trevpar",
  GOPPAR = "goppar",
  ROOM_REVENUE = "room_revenue",
  TOTAL_REVENUE = "total_revenue",
  CANCELLATION_RATE = "cancellation_rate",
  AVERAGE_LENGTH_OF_STAY = "average_length_of_stay",
  ROOMS_SOLD = "rooms_sold",
}

/** Instantané des indicateurs de performance d'une propriété sur une période. Les données brutes (chambres disponibles/vendues, revenus…) sont fournies par l'appelant ; les indicateurs sont calculés par `KpiCalculator`. Les taux sont exprimés en pourcentage (0-100), les montants dans `currency`. */
export interface Kpi extends AuditableEntity {
  property_id: string;
  period_type: KpiPeriodType;
  period_start: string;
  period_end: string;
  currency: Currency;
  /** Nuitées-chambres disponibles sur la période (chambres × nuits). */
  rooms_available: number;
  /** Nuitées-chambres vendues sur la période. */
  rooms_sold: number;
  /** Chiffre d'affaires hébergement. */
  room_revenue: number;
  /** Chiffre d'affaires total (hébergement + F&B + services). */
  total_revenue: number;
  /** Résultat brut d'exploitation (peut être négatif). */
  gross_operating_profit?: number;
  reservations_count: number;
  cancellations_count: number;
  /** Nombre de séjours terminés (pour la durée moyenne de séjour). */
  stays_count: number;
  guests_count: number;
  /** Taux d'occupation (%) = chambres vendues / disponibles. */
  occupancy_rate: number;
  /** Prix moyen par chambre vendue = CA hébergement / chambres vendues. */
  adr: number;
  /** Revenu par chambre disponible = CA hébergement / chambres disponibles. */
  revpar: number;
  /** Revenu total par chambre disponible. */
  trevpar: number;
  /** Résultat brut d'exploitation par chambre disponible. */
  goppar?: number;
  /** Taux d'annulation (%) = annulations / réservations. */
  cancellation_rate: number;
  /** Durée moyenne de séjour (nuits) = chambres vendues / séjours. */
  average_length_of_stay: number;
  computed_at: string;
  metadata: Record<string, unknown>;
}

export interface KpiTrendPoint {
  period_start: string;
  period_end: string;
  value: null | number;
}

export interface KpiComparison {
  current: Kpi;
  previous: null | Kpi;
  variations: { occupancy_rate?: MetricVariation; adr?: MetricVariation; revpar?: MetricVariation; trevpar?: MetricVariation; goppar?: MetricVariation; room_revenue?: MetricVariation; total_revenue?: MetricVariation; cancellation_rate?: MetricVariation; average_length_of_stay?: MetricVariation; rooms_sold?: MetricVariation };
}
