// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/recommendation/
// =============================================================================

import type { AuditableEntity, Currency, MoneyEmbeddable } from "./base-entities";
import type { MoneyDto, PaginationQueryDto } from "./common";

/** Création manuelle d'une recommandation (ex. proposée par le personnel). */
export interface CreateRecommendationDto {
  guest_id: string;
  property_id: string;
  reservation_id?: string;
  type: RecommendationType;
  item_id?: string;
  item_type?: string;
  title: string;
  description?: string;
  category?: string;
  tags?: string[];
  price?: MoneyDto;
  score: number;
  reasons?: string[];
  expires_at?: string;
  metadata?: Record<string, unknown>;
}

export interface GuestProfileDto {
  preferences?: string[];
  past_categories?: string[];
  average_spend?: number;
  stay_purpose?: string;
  excluded_categories?: string[];
}

export interface RecommendationCandidateDto {
  title: string;
  type: RecommendationType;
  category?: string;
  tags?: string[];
  price?: number;
  item_id?: string;
  item_type?: string;
  description?: string;
}

/** Calcul de scores sans persistance. */
export interface ScoreCandidatesDto {
  profile: GuestProfileDto;
  candidates: RecommendationCandidateDto[];
  limit?: number;
  min_score?: number;
}

/** Génération et enregistrement des meilleures recommandations d'un client. */
export interface GenerateRecommendationsDto extends ScoreCandidatesDto {
  guest_id: string;
  property_id: string;
  reservation_id?: string;
  currency?: Currency;
  /** Durée de validité en jours (défaut 7). */
  ttl_days?: number;
}

export interface RecommendationFilterQueryDto extends PaginationQueryDto {
  status?: RecommendationStatus;
  type?: RecommendationType;
}

export interface ConversionStatsQueryDto {
  property_id?: string;
  guest_id?: string;
  type?: RecommendationType;
  from?: string;
  to?: string;
}

export interface AcceptRecommendationDto {
  /** Montant réellement encaissé (défaut : prix de la recommandation). */
  revenue?: number;
}

export interface DismissRecommendationDto {
  reason?: string;
}

/** Mise à jour du contenu d'une recommandation. Le statut évolue uniquement via les routes `shown`, `accept` et `dismiss`. */
export type UpdateRecommendationDto = Partial<CreateRecommendationDto>;

/** Élément candidat à la recommandation. */
export interface RecommendationCandidate {
  title: string;
  type: RecommendationType;
  category?: string;
  tags?: string[];
  price?: number;
  item_id?: string;
  item_type?: string;
  description?: string;
}

export interface ScoredCandidate extends RecommendationCandidate {
  score: number;
  reasons: string[];
  breakdown: Record<"preferences" | "history" | "budget" | "purpose", number>;
}

export interface TypeConversion {
  exposed: number;
  accepted: number;
  conversion_rate: number;
}

export interface ConversionStats {
  total: number;
  by_status: Record<RecommendationStatus, number>;
  /** Recommandations effectivement vues (affichées, acceptées ou refusées). */
  exposed: number;
  /** % acceptées / exposées. */
  conversion_rate: number;
  /** % acceptées / (acceptées + refusées) : taux de réponse positive. */
  acceptance_rate: number;
  revenue_generated: number;
  by_type: { upsell?: TypeConversion; cross_sell?: TypeConversion; service?: TypeConversion; room?: TypeConversion; package?: TypeConversion };
}

/** Nature de la recommandation. */
export enum RecommendationType {
  UPSELL = "upsell",
  CROSS_SELL = "cross_sell",
  SERVICE = "service",
  ROOM = "room",
  PACKAGE = "package",
}

/** Cycle de vie d'une recommandation. */
export enum RecommendationStatus {
  PENDING = "pending",
  SHOWN = "shown",
  ACCEPTED = "accepted",
  DISMISSED = "dismissed",
  EXPIRED = "expired",
}

/** Recommandation personnalisée proposée à un client. */
export interface Recommendation extends AuditableEntity {
  guest_id: string;
  property_id: string;
  reservation_id?: string;
  type: RecommendationType;
  /** Élément recommandé (type de chambre, article POS, offre…). */
  item_id?: string;
  /** Collection de l'élément recommandé (`RoomType`, `PosItem`…). */
  item_type?: string;
  title: string;
  description?: string;
  /** Catégorie métier (spa, restaurant, room_upgrade…). */
  category?: string;
  tags: string[];
  price?: MoneyEmbeddable;
  /** Pertinence estimée entre 0 et 1. */
  score: number;
  /** Raisons lisibles ayant conduit à la recommandation. */
  reasons: string[];
  status: RecommendationStatus;
  shown_at?: string;
  responded_at?: string;
  expires_at?: string;
  dismiss_reason?: string;
  /** Chiffre d'affaires réalisé si la recommandation est acceptée. */
  revenue_generated: number;
  model_version: string;
  metadata: Record<string, unknown>;
}
