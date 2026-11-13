// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/rate-plan/
// =============================================================================

import type { AuditableEntity, BookingChannel, MoneyEmbeddable } from "./base-entities";
import type { MoneyDto } from "./common";

export interface CancellationPolicyDto {
  type: CancellationPolicyType;
  free_cancellation_hours?: number;
  penalty_percent?: number;
  description?: string;
}

/** DTO de création d'un plan tarifaire (`createRatePlan`). */
export interface CreateRatePlanDto {
  property_id: string;
  room_type_ids?: string[];
  name: string;
  code: string;
  description?: string;
  base_price: MoneyDto;
  meal_plan?: MealPlan;
  cancellation_policy?: CancellationPolicyDto;
  min_stay?: number;
  max_stay?: number;
  min_advance_days?: number;
  max_advance_days?: number;
  arrival_days?: number[];
  channels?: BookingChannel[];
  conditions?: string;
  valid_from?: string;
  valid_to?: string;
  is_active?: boolean;
}

/** Critères de recherche des plans applicables à un séjour. */
export interface ApplicableRatePlansQueryDto {
  room_type_id?: string;
  check_in: string;
  check_out: string;
  channel?: BookingChannel;
}

/** Données de calcul des frais d'annulation. */
export interface CancellationFeeDto {
  total_amount: number;
  check_in: string;
  cancelled_at?: string;
}

/** La propriété d'un plan tarifaire n'est pas modifiable. */
export type UpdateRatePlanDto = Partial<Omit<CreateRatePlanDto, "property_id">>;

/** Formule de restauration incluse dans le tarif. */
export enum MealPlan {
  ROOM_ONLY = "room_only",
  BREAKFAST = "breakfast",
  HALF_BOARD = "half_board",
  FULL_BOARD = "full_board",
  ALL_INCLUSIVE = "all_inclusive",
}

/** Type de politique d'annulation. */
export enum CancellationPolicyType {
  FLEXIBLE = "flexible",
  MODERATE = "moderate",
  STRICT = "strict",
  NON_REFUNDABLE = "non_refundable",
}

/** Politique d'annulation : annulation gratuite jusqu'à `free_cancellation_hours` avant l'arrivée, puis pénalité de `penalty_percent` % du montant total. `non_refundable` = 100 % retenu. */
export interface CancellationPolicy {
  type: CancellationPolicyType;
  free_cancellation_hours: number;
  penalty_percent: number;
  description?: string;
}

/** Plan tarifaire (ex. « Non remboursable », « Petit-déjeuner inclus »). Définit un prix de base par nuit, des conditions de séjour (durée min/max, anticipation, jours d'arrivée), une politique d'annulation et une période de validité. */
export interface RatePlan extends AuditableEntity {
  property_id: string;
  /** Types de chambre concernés (vide = tous les types de la propriété). */
  room_type_ids: string[];
  name: string;
  code: string;
  description?: string;
  /** Prix de base par nuit. */
  base_price: MoneyEmbeddable;
  meal_plan: MealPlan;
  cancellation_policy: CancellationPolicy;
  min_stay: number;
  max_stay?: number;
  /** Réservation au moins X jours avant l'arrivée (early booking). */
  min_advance_days?: number;
  /** Réservation au plus X jours avant l'arrivée (last minute). */
  max_advance_days?: number;
  /** Jours d'arrivée autorisés (0 = dimanche … 6 = samedi). Vide = tous. */
  arrival_days: number[];
  /** Canaux de vente autorisés. Vide = tous. */
  channels: BookingChannel[];
  /** Conditions particulières affichées au client. */
  conditions?: string;
  valid_from?: string;
  valid_to?: string;
  is_active: boolean;
}

export interface CancellationFeeResult {
  policy_type: CancellationPolicyType;
  total_amount: number;
  fee: number;
  refund_amount: number;
  is_free_cancellation: boolean;
  hours_before_arrival: number;
}
