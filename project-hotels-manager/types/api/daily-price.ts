// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/daily-price/
// =============================================================================

import type { AuditableEntity, MoneyEmbeddable } from "./base-entities";
import type { MoneyDto } from "./common";

/** DTO de création d'un prix pour une nuit (`setDailyPrice`). */
export interface CreateDailyPriceDto {
  property_id: string;
  room_type_id: string;
  rate_plan_id?: string;
  date: string;
  price: MoneyDto;
  min_stay?: number;
  is_closed?: boolean;
  source?: DailyPriceSource;
  notes?: string;
}

/** Définition en masse d'un prix sur une plage de dates (bornes incluses). */
export interface BulkSetDailyPriceDto {
  property_id: string;
  room_type_id: string;
  rate_plan_id?: string;
  start_date: string;
  end_date: string;
  price: MoneyDto;
  /** Jours concernés (0 = dimanche … 6 = samedi). Vide = tous les jours. */
  days_of_week?: number[];
  min_stay?: number;
  is_closed?: boolean;
  source?: DailyPriceSource;
}

/** Plage de dates (bornes incluses) pour le calendrier des prix. */
export interface PriceCalendarQueryDto {
  start_date: string;
  end_date: string;
  rate_plan_id?: string;
}

/** Séjour (départ exclu) pour le calcul du prix total. */
export interface StayPriceQueryDto {
  check_in: string;
  check_out: string;
  rate_plan_id?: string;
}

/** Seuls le prix et ses attributs sont modifiables (pas la clé type/plan/date). */
export type UpdateDailyPriceDto = Partial<Pick<CreateDailyPriceDto, "price" | "min_stay" | "is_closed" | "source" | "notes">>;

/** Origine d'un prix journalier. */
export enum DailyPriceSource {
  MANUAL = "manual",
  BULK = "bulk",
  DYNAMIC = "dynamic",
  OTA = "ota",
}

/** Prix d'un type de chambre pour une nuit donnée (calendrier tarifaire). `date` est normalisée à minuit UTC. Un prix peut être propre à un plan tarifaire (`rate_plan_id`) ou générique (`rate_plan_id` nul). `is_closed` ferme la vente pour cette nuit (stop sell). */
export interface DailyPrice extends AuditableEntity {
  property_id: string;
  room_type_id: string;
  rate_plan_id?: null | string;
  date: string;
  price: MoneyEmbeddable;
  /** Durée minimale de séjour pour une arrivée ce jour-là. */
  min_stay?: number;
  is_closed: boolean;
  source: DailyPriceSource;
  notes?: string;
}

export interface PriceCalendarDay {
  date: string;
  price: null | number;
  currency: null | string;
  is_closed: boolean;
  min_stay: null | number;
  source: DailyPriceSource | null;
}

export interface PriceCalendar {
  room_type_id: string;
  rate_plan_id: null | string;
  start_date: string;
  end_date: string;
  days: PriceCalendarDay[];
}

export interface BulkSetResult {
  dates: number;
  upserted: number;
  modified: number;
}

export interface StayPrice {
  room_type_id: string;
  nights: number;
  currency: string;
  total: number;
  average_per_night: number;
  breakdown: Array<{ date: string; amount: number }>;
}
