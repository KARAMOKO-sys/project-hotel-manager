// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/blocked-date/
// =============================================================================

import type { AuditableEntity } from "./base-entities";

/** Filtre de période (query string) pour la consultation des blocages. */
export interface BlockedDateRangeQueryDto {
  start_date: string;
  end_date: string;
  room_id?: string;
  room_type_id?: string;
}

/** DTO de blocage d'une période. Sans `room_id` ni `room_type_id`, toute la propriété est bloquée. */
export interface CreateBlockedDateDto {
  property_id: string;
  room_id?: string;
  room_type_id?: string;
  start_date: string;
  end_date: string;
  reason?: BlockReason;
  notes?: string;
  blocked_by?: string;
}

/** La propriété d'un blocage ne peut pas être modifiée. */
export type UpdateBlockedDateDto = Partial<Omit<CreateBlockedDateDto, "property_id">>;

/** Motif du blocage d'une période. */
export enum BlockReason {
  MAINTENANCE = "maintenance",
  RENOVATION = "renovation",
  OWNER_USE = "owner_use",
  EVENT = "event",
  OTHER = "other",
}

/** Période bloquée (non réservable) pour une chambre, un type de chambre ou l'ensemble d'un établissement. - `room_id` renseigné : blocage d'une chambre précise ; - `room_type_id` renseigné : blocage de tout un type de chambre ; - aucun des deux : blocage de toute la propriété. Les bornes `start_date` et `end_date` sont inclusives (jour entier). */
export interface BlockedDate extends AuditableEntity {
  property_id: string;
  room_id?: string;
  room_type_id?: string;
  start_date: string;
  end_date: string;
  reason: BlockReason;
  notes?: string;
  blocked_by?: string;
  /** Passe à `false` lorsque la période est libérée (déblocage). */
  is_active: boolean;
  unblocked_at?: string;
}
