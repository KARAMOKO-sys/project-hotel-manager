// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/guest-preference/
// =============================================================================

import type { AuditableEntity } from "./base-entities";

export interface CreateGuestPreferenceDto {
  guest_id: string;
  preference_type: string;
  value?: string;
  notes?: string;
}

export type UpdateGuestPreferenceDto = Partial<CreateGuestPreferenceDto>;

/** Préférence d'un client (chambre calme, étage élevé, oreiller ferme…). */
export interface GuestPreference extends AuditableEntity {
  guest_id: string;
  preference_type: string;
  value?: string;
  notes?: string;
}
