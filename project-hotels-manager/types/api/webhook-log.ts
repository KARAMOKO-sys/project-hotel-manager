// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/webhook-log/
// =============================================================================

import type { AuditableEntity } from "./base-entities";
import type { PaginationQueryDto } from "./common";

export interface CreateWebhookLogDto {
  provider: WebhookProvider;
  event_type: string;
  event_id?: string;
  property_id?: string;
  payload: Record<string, unknown>;
  headers?: Record<string, unknown>;
  signature?: string;
  signature_verified?: boolean;
  max_attempts?: number;
  ip_address?: string;
  related_entity_type?: string;
  related_entity_id?: string;
  notes?: string;
}

/** La charge utile, la signature et le statut sont immuables via la mise à jour générique (utiliser les routes de traitement dédiées). */
export type UpdateWebhookLogDto = Partial<Pick<CreateWebhookLogDto, "property_id" | "related_entity_type" | "related_entity_id" | "notes">>;

export interface MarkWebhookProcessedDto {
  result?: Record<string, unknown>;
  related_entity_type?: string;
  related_entity_id?: string;
}

export interface MarkWebhookFailedDto {
  error_message: string;
}

export interface VerifySignatureDto {
  verified: boolean;
}

export interface WebhookLogQueryDto extends PaginationQueryDto {
  provider?: WebhookProvider;
  status?: WebhookStatus;
  event_type?: string;
  property_id?: string;
  from?: string;
  to?: string;
}

export interface IgnoreWebhookDto {
  reason?: string;
}

/** Fournisseurs émetteurs de webhooks (paiement et OTA). */
export enum WebhookProvider {
  STRIPE = "stripe",
  ORANGE_MONEY = "orange_money",
  MTN_MOMO = "mtn_momo",
  MOOV_MONEY = "moov_money",
  WAVE = "wave",
  BOOKING = "booking",
  EXPEDIA = "expedia",
  AIRBNB = "airbnb",
  AGODA = "agoda",
  OTHER = "other",
}

/** Statut de traitement d'un webhook reçu. */
export enum WebhookStatus {
  RECEIVED = "received",
  PROCESSING = "processing",
  PROCESSED = "processed",
  FAILED = "failed",
  IGNORED = "ignored",
}

/** Journal des webhooks entrants : conserve la charge utile brute, le résultat de la vérification de signature et l'état de traitement (avec renvois). */
export interface WebhookLog extends AuditableEntity {
  provider: WebhookProvider;
  /** Type d'événement (ex : payment_intent.succeeded, reservation.created). */
  event_type: string;
  /** Identifiant de l'événement chez le fournisseur (idempotence). */
  event_id?: string;
  property_id?: string;
  payload: Record<string, unknown>;
  headers: Record<string, unknown>;
  signature?: string;
  signature_verified: boolean;
  status: WebhookStatus;
  /** Vrai si l'événement avait déjà été reçu (renvoi du fournisseur). */
  is_duplicate: boolean;
  attempts: number;
  max_attempts: number;
  received_at: string;
  processed_at?: string;
  last_attempt_at?: string;
  error_message?: string;
  /** Résultat du traitement (identifiant de paiement créé…). */
  result?: Record<string, unknown>;
  ip_address?: string;
  related_entity_type?: string;
  related_entity_id?: string;
  notes?: string;
}

/** Statistiques des webhooks par fournisseur et statut. */
export interface WebhookStats {
  total: number;
  by_provider: Record<string, Record<string, number>>;
  by_status: Record<string, number>;
  success_rate: number;
}
