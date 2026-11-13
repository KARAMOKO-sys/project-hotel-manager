// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/dynamic-pricing-rule/
// =============================================================================

import type { AuditableEntity } from "./base-entities";

/** DTO de création d'une règle de tarification dynamique (`createRule`). */
export interface CreateDynamicPricingRuleDto {
  property_id: string;
  room_type_ids?: string[];
  name: string;
  description?: string;
  rule_type: PricingRuleType;
  adjustment_percent: number;
  start_date?: string;
  end_date?: string;
  days_before_arrival?: number;
  occupancy_threshold?: number;
  days_of_week?: number[];
  priority?: number;
  /** Ignoré si la règle requiert une validation (> 25 %). */
  is_active?: boolean;
}

/** Données de calcul d'un prix ajusté (`calculateAdjustedPrice`). */
export interface CalculateAdjustedPriceDto {
  base_price: number;
  /** Nuit concernée. */
  date: string;
  /** Date de réservation (défaut : maintenant). */
  booking_date?: string;
  /** Taux d'occupation prévu de la nuit (%). */
  occupancy_rate?: number;
  room_type_id?: string;
}

export interface ValidateRuleDto {
  validated_by?: string;
}

/** La propriété d'une règle n'est pas modifiable. */
export type UpdateDynamicPricingRuleDto = Partial<Omit<CreateDynamicPricingRuleDto, "property_id">>;

/** Type de règle de tarification dynamique. */
export enum PricingRuleType {
  SEASONALITY = "seasonality",
  EVENT = "event",
  LAST_MINUTE = "last_minute",
  OCCUPANCY_THRESHOLD = "occupancy_threshold",
}

/** Règle de tarification dynamique : ajuste le prix de base d'un pourcentage (entre -20 % et +50 %) lorsque ses conditions sont réunies. Toute règle dont la variation dépasse 25 % doit être validée (`validated_at`) avant de pouvoir être activée. */
export interface DynamicPricingRule extends AuditableEntity {
  property_id: string;
  /** Types de chambre concernés (vide = tous). */
  room_type_ids: string[];
  name: string;
  description?: string;
  rule_type: PricingRuleType;
  adjustment_percent: number;
  /** Début de période (saisonnalité / événement). */
  start_date?: string;
  /** Fin de période incluse (saisonnalité / événement). */
  end_date?: string;
  /** Dernière minute : s'applique si l'arrivée est à X jours ou moins. */
  days_before_arrival?: number;
  /** Occupation : s'applique si le taux d'occupation (%) ≥ seuil. */
  occupancy_threshold?: number;
  /** Jours de la semaine concernés (0 = dimanche … 6 = samedi). Vide = tous. */
  days_of_week: number[];
  /** Ordre d'affichage / d'évaluation (plus élevé = évalué en premier). */
  priority: number;
  is_active: boolean;
  /** Vrai si |ajustement| > 25 % : validation humaine obligatoire. */
  requires_validation: boolean;
  validated_at?: string;
  validated_by?: string;
}

export interface AppliedRule {
  rule_id: string;
  name: string;
  rule_type: PricingRuleType;
  adjustment_percent: number;
}

export interface PricingResult {
  base_price: number;
  adjusted_price: number;
  /** Somme brute des ajustements des règles appliquées. */
  raw_adjustment_percent: number;
  /** Ajustement effectivement appliqué, borné à [-20 %, +50 %]. */
  total_adjustment_percent: number;
  was_clamped: boolean;
  /** Vrai si la variation finale dépasse 25 % (validation requise). */
  requires_validation: boolean;
  applied_rules: AppliedRule[];
}
