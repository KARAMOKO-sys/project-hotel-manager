// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/reservation-room/
// =============================================================================

import type { AuditableEntity, MoneyEmbeddable } from "./base-entities";
import type { MoneyDto } from "./common";

export interface CreateReservationRoomDto {
  reservation_id: string;
  room_id: string;
  rate?: MoneyDto;
  guests?: number;
  notes?: string;
}

export type UpdateReservationRoomDto = Partial<CreateReservationRoomDto>;

/** Lien entre une réservation et une chambre concrète (avec le tarif appliqué). */
export interface ReservationRoom extends AuditableEntity {
  reservation_id: string;
  room_id: string;
  rate: MoneyEmbeddable;
  guests?: number;
  notes?: string;
}
