// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/waitlist/
// =============================================================================

import type { AuditableEntity, BaseEntitiesLoyaltyTier, NotificationChannel } from "./base-entities";
import type { PaginationQueryDto } from "./common";

/** Préférences du client (type de lit, vue, flexibilité des dates…). */
export interface WaitlistPreferencesDto {
  alternative_room_type_ids?: string[];
  bed_type?: string;
  view?: string;
  floor?: number;
  smoking?: boolean;
  date_flexibility_days?: number;
  max_budget?: number;
  notes?: string;
}

/** DTO d'ajout d'un client en liste d'attente (`addToWaitlist`). */
export interface CreateWaitlistDto {
  property_id: string;
  guest_id: string;
  room_type_id?: string;
  check_in: string;
  check_out: string;
  adults?: number;
  children?: number;
  preferences?: WaitlistPreferencesDto;
  /** Niveau de fidélité du client, utilisé pour calculer la priorité. */
  loyalty_tier?: BaseEntitiesLoyaltyTier;
  /** Bonus de priorité manuel (geste commercial, VIP…). */
  priority_boost?: number;
  notification_channel?: NotificationChannel;
  contact_email?: string;
  contact_phone?: string;
}

/** Le client et la propriété d'une entrée ne sont pas modifiables. */
export type UpdateWaitlistDto = Partial<Omit<CreateWaitlistDto, "property_id" | "guest_id">>;

/** Pagination + filtre optionnel par statut. */
export interface WaitlistQueryDto extends PaginationQueryDto {
  status?: WaitlistStatus;
}

/** Disponibilité libérée à proposer aux clients en attente. */
export interface NotifyAvailabilityDto {
  room_type_id?: string;
  start_date: string;
  end_date: string;
  /** Nombre maximum de clients à notifier (= chambres libérées). */
  limit?: number;
}

/** Rattache l'entrée à la réservation créée. */
export interface ConvertWaitlistDto {
  reservation_id: string;
}

export interface CancelWaitlistDto {
  reason?: string;
}

/** Cycle de vie d'une entrée de liste d'attente. */
export enum WaitlistStatus {
  WAITING = "waiting",
  NOTIFIED = "notified",
  CONFIRMED = "confirmed",
  CONVERTED = "converted",
  EXPIRED = "expired",
  CANCELLED = "cancelled",
}

/** Préférences exprimées par le client en liste d'attente. */
export interface WaitlistPreferences {
  alternative_room_type_ids: string[];
  bed_type?: string;
  view?: string;
  floor?: number;
  smoking?: boolean;
  /** Accepte des dates proches (± `date_flexibility_days`). */
  date_flexibility_days: number;
  max_budget?: number;
  notes?: string;
}

/** Entrée de liste d'attente : un client souhaitant un séjour sur une période complète. Les entrées sont servies par priorité décroissante (fidélité), puis par ancienneté. */
export interface Waitlist extends AuditableEntity {
  property_id: string;
  guest_id: string;
  /** Type de chambre souhaité (absent = n'importe quel type). */
  room_type_id?: string;
  check_in: string;
  check_out: string;
  adults: number;
  children: number;
  preferences: WaitlistPreferences;
  status: WaitlistStatus;
  loyalty_tier: BaseEntitiesLoyaltyTier;
  /** Priorité calculée (fidélité + bonus manuel). Plus élevé = servi d'abord. */
  priority: number;
  notification_channel: NotificationChannel;
  contact_email?: string;
  contact_phone?: string;
  notified_at?: string;
  /** Date limite de confirmation (notification + 4 h). */
  confirmation_deadline?: string;
  confirmed_at?: string;
  reservation_id?: string;
  notification_count: number;
  cancellation_reason?: string;
}

export interface WaitlistPosition {
  id: string;
  position: number;
  total_waiting: number;
}

export interface WaitlistStatistics {
  total: number;
  current_size: number;
  by_status: Record<WaitlistStatus, number>;
  conversion_rate: number;
  expiration_rate: number;
}
