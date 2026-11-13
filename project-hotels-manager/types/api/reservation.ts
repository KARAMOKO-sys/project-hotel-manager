// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/reservation/
// =============================================================================

import type { AuditableEntity, BookingChannel, MoneyEmbeddable, ReservationSource } from "./base-entities";
import type { MoneyDto } from "./common";

export interface CreateReservationDto {
  property_id: string;
  guest_id: string;
  room_type_id: string;
  check_in: string;
  check_out: string;
  adults?: number;
  children?: number;
  source?: ReservationSource;
  channel?: BookingChannel;
  total_amount?: MoneyDto;
  special_requests?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export type UpdateReservationDto = Partial<CreateReservationDto>;

export enum ReservationStatus {
  PENDING = "pending",
  CONFIRMED = "confirmed",
  CHECKED_IN = "checked_in",
  CHECKED_OUT = "checked_out",
  CANCELLED = "cancelled",
  NO_SHOW = "no_show",
}

export interface Reservation extends AuditableEntity {
  confirmation_code: string;
  property_id: string;
  guest_id: string;
  room_type_id?: string;
  check_in: string;
  check_out: string;
  status: ReservationStatus;
  source: ReservationSource;
  channel: BookingChannel;
  adults?: number;
  children?: number;
  total_amount: MoneyEmbeddable;
  special_requests?: string;
  cancellation_reason?: string;
  cancellation_fee?: number;
  notes?: string;
  metadata: Record<string, unknown>;
}
