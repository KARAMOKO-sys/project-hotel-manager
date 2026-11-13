// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/guest-segment/
// =============================================================================

import type { AuditableEntity } from "./base-entities";

export interface CreateGuestSegmentDto {
  property_id?: string;
  name: string;
  description?: string;
  criteria?: Record<string, unknown>;
  is_active?: boolean;
}

export type UpdateGuestSegmentDto = Partial<CreateGuestSegmentDto>;

/** Segment de clients défini par des critères dynamiques. */
export interface GuestSegment extends AuditableEntity {
  property_id?: string;
  name: string;
  description?: string;
  criteria: Record<string, unknown>;
  member_count: number;
  is_active: boolean;
}
