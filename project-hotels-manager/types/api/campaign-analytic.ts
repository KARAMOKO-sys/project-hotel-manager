// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/campaign-analytic/
// =============================================================================

import type { AuditableEntity } from "./base-entities";

export interface CreateCampaignAnalyticDto {
  campaign_id: string;
  guest_id?: string;
  event: CampaignEvent;
  link?: string;
  ip?: string;
  metadata?: Record<string, unknown>;
}

export type UpdateCampaignAnalyticDto = Partial<CreateCampaignAnalyticDto>;

/** Type d'événement de campagne suivi. */
export enum CampaignEvent {
  OPEN = "open",
  CLICK = "click",
  CONVERSION = "conversion",
}

/** Événement de campagne (ouverture, clic, conversion) enregistré pour analytics. */
export interface CampaignAnalytic extends AuditableEntity {
  campaign_id: string;
  guest_id?: string;
  event: CampaignEvent;
  link?: string;
  ip?: string;
  metadata: Record<string, unknown>;
}
