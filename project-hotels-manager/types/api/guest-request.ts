// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/guest-request/
// =============================================================================

import type { AuditableEntity, TaskPriority, TaskStatus } from "./base-entities";

export interface CreateGuestRequestDto {
  property_id: string;
  guest_id?: string;
  room_id?: string;
  staff_id?: string;
  type: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
}

export type UpdateGuestRequestDto = Partial<CreateGuestRequestDto>;

/** Demande d'un client (serviettes, réveil, room service…). */
export interface GuestRequest extends AuditableEntity {
  property_id: string;
  guest_id?: string;
  room_id?: string;
  staff_id?: string;
  type: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  completed_at?: string;
  cancelled_reason?: string;
  satisfaction_rating?: number;
}
