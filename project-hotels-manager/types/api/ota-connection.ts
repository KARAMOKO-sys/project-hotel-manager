// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/ota-connection/
// =============================================================================

import type { AuditableEntity } from "./base-entities";

export interface OtaRoomMappingDto {
  room_type_id: string;
  ota_room_type_id: string;
  ota_rate_plan_id?: string;
}

export interface CreateOtaConnectionDto {
  property_id: string;
  provider: OtaProvider;
  ota_property_id: string;
  display_name?: string;
  /** Identifiants d'API (api_key, username, password…). */
  credentials?: Record<string, string>;
  room_mappings?: OtaRoomMappingDto[];
  sync_availability?: boolean;
  sync_rates?: boolean;
  sync_reservations?: boolean;
  commission_rate?: number;
  metadata?: Record<string, unknown>;
}

export interface UpdateOtaCredentialsDto {
  credentials: Record<string, string>;
}

export interface SetRoomMappingsDto {
  room_mappings: OtaRoomMappingDto[];
}

export interface OtaSyncStatsDto {
  reservations_imported?: number;
  availability_updates?: number;
  rate_updates?: number;
  error_count?: number;
}

/** Résultat d'une synchronisation rapporté par le worker d'intégration. */
export interface RecordSyncDto {
  success: boolean;
  stats?: OtaSyncStatsDto;
  error?: string;
}

/** L'établissement et le fournisseur sont figés ; les identifiants et les correspondances de chambres passent par des routes dédiées. */
export type UpdateOtaConnectionDto = Partial<Omit<CreateOtaConnectionDto, "property_id" | "provider" | "credentials" | "room_mappings">>;

/** Agences de voyage en ligne (OTA) supportées. */
export enum OtaProvider {
  BOOKING = "booking",
  EXPEDIA = "expedia",
  AIRBNB = "airbnb",
  AGODA = "agoda",
}

/** État de la connexion à l'OTA. */
export enum OtaConnectionStatus {
  PENDING = "pending",
  ACTIVE = "active",
  DISABLED = "disabled",
  ERROR = "error",
}

/** État de la dernière synchronisation. */
export enum OtaSyncStatus {
  NEVER = "never",
  IN_PROGRESS = "in_progress",
  SUCCESS = "success",
  PARTIAL = "partial",
  FAILED = "failed",
}

/** Correspondance entre un type de chambre interne et celui de l'OTA. */
export interface OtaRoomMapping {
  room_type_id: string;
  ota_room_type_id: string;
  ota_rate_plan_id?: string;
}

/** Statistiques de la dernière synchronisation. */
export interface OtaSyncStats {
  reservations_imported: number;
  availability_updates: number;
  rate_updates: number;
  error_count: number;
}

/** Connexion d'un établissement à une OTA (Booking, Expedia, Airbnb, Agoda) : identifiants (non renvoyés par défaut), correspondance des types de chambre et suivi des synchronisations. */
export interface OtaConnection extends AuditableEntity {
  property_id: string;
  provider: OtaProvider;
  /** Identifiant de l'établissement chez l'OTA (hotel id / listing id). */
  ota_property_id: string;
  display_name?: string;
  /** Identifiants d'API — jamais renvoyés par défaut (`select: false`). */
  credentials: Record<string, string>;
  room_mappings: OtaRoomMapping[];
  status: OtaConnectionStatus;
  is_enabled: boolean;
  sync_availability: boolean;
  sync_rates: boolean;
  sync_reservations: boolean;
  /** Commission de l'OTA en pourcentage. */
  commission_rate: number;
  sync_status: OtaSyncStatus;
  sync_started_at?: string;
  last_sync_at?: string;
  last_successful_sync_at?: string;
  last_sync_error?: string;
  last_sync_stats?: OtaSyncStats;
  consecutive_failures: number;
  last_tested_at?: string;
  metadata: Record<string, unknown>;
}

/** Résultat d'un test de connexion. */
export interface OtaConnectionTestResult {
  ok: boolean;
  provider: OtaProvider;
  status: OtaConnectionStatus;
  missing_credentials: string[];
  message: string;
  tested_at: string;
}

/** Synthèse de l'état d'une connexion OTA. */
export interface OtaConnectionStatusSummary {
  provider: OtaProvider;
  status: OtaConnectionStatus;
  is_enabled: boolean;
  sync_status: OtaSyncStatus;
  last_sync_at?: string;
  last_successful_sync_at?: string;
  last_sync_error?: string;
  consecutive_failures: number;
  mapped_room_types: number;
}
