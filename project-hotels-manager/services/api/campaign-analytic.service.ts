// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/campaign-analytic/controllers/campaign-analytic.controller.ts
// =============================================================================

import { apiClient } from "./client";
import type { CampaignAnalytic } from "@/types/api";

/** POST /campaign-analytics/:campaignId/open */
export async function trackOpen(campaignId: string, body: { guest_id?: string; ip?: string } = {}): Promise<CampaignAnalytic> {
  const { data } = await apiClient.post<CampaignAnalytic>(`/campaign-analytics/${encodeURIComponent(campaignId)}/open`, body);
  return data;
}

/** POST /campaign-analytics/:campaignId/click */
export async function trackClick(campaignId: string, body: { guest_id?: string; link?: string } = {}): Promise<CampaignAnalytic> {
  const { data } = await apiClient.post<CampaignAnalytic>(`/campaign-analytics/${encodeURIComponent(campaignId)}/click`, body);
  return data;
}

/** POST /campaign-analytics/:campaignId/conversion */
export async function trackConversion(campaignId: string, body: { guest_id?: string; conversion_data?: Record<string, unknown> } = {}): Promise<CampaignAnalytic> {
  const { data } = await apiClient.post<CampaignAnalytic>(`/campaign-analytics/${encodeURIComponent(campaignId)}/conversion`, body);
  return data;
}

/** GET /campaign-analytics/:campaignId/stats */
export async function getRealtimeStats(campaignId: string): Promise<{ opens: number; clicks: number; conversions: number; total: number }> {
  const { data } = await apiClient.get<{ opens: number; clicks: number; conversions: number; total: number }>(`/campaign-analytics/${encodeURIComponent(campaignId)}/stats`);
  return data;
}
