// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/campaign/
// =============================================================================

import type { AuditableEntity, CampaignStatus, CampaignType } from "./base-entities";

export interface CreateCampaignDto {
  property_id?: string;
  segment_id?: string;
  name: string;
  type?: CampaignType;
  status?: CampaignStatus;
  subject?: string;
  content?: string;
  scheduled_at?: string;
}

export type UpdateCampaignDto = Partial<CreateCampaignDto>;

/** Campagne marketing (email, SMS, push, offre). */
export interface Campaign extends AuditableEntity {
  property_id?: string;
  segment_id?: string;
  name: string;
  type: CampaignType;
  status: CampaignStatus;
  subject?: string;
  content?: string;
  scheduled_at?: string;
  sent_at?: string;
  recipient_count: number;
  metadata: Record<string, unknown>;
}
