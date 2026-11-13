// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/campaign/controllers/campaign.controller.ts
// =============================================================================

import { apiClient } from "./client";
import type { Campaign, CampaignStatus, CreateCampaignDto, PaginatedResult, PaginationQueryDto, UpdateCampaignDto } from "@/types/api";

/** POST /campaigns */
export async function create(body: CreateCampaignDto): Promise<Campaign> {
  const { data } = await apiClient.post<Campaign>("/campaigns", body);
  return data;
}

/** GET /campaigns */
export async function findAll(query?: PaginationQueryDto): Promise<PaginatedResult<Campaign>> {
  const { data } = await apiClient.get<PaginatedResult<Campaign>>("/campaigns", { params: query });
  return data;
}

/** GET /campaigns/property/:propertyId */
export async function findByProperty(propertyId: string, query?: PaginationQueryDto): Promise<PaginatedResult<Campaign>> {
  const { data } = await apiClient.get<PaginatedResult<Campaign>>(`/campaigns/property/${encodeURIComponent(propertyId)}`, { params: query });
  return data;
}

/** GET /campaigns/:id */
export async function findOne(id: string): Promise<Campaign> {
  const { data } = await apiClient.get<Campaign>(`/campaigns/${encodeURIComponent(id)}`);
  return data;
}

/** PATCH /campaigns/:id */
export async function update(id: string, body: UpdateCampaignDto = {}): Promise<Campaign> {
  const { data } = await apiClient.patch<Campaign>(`/campaigns/${encodeURIComponent(id)}`, body);
  return data;
}

/** PATCH /campaigns/:id/schedule */
export async function schedule(id: string, body: { scheduled_at: string }): Promise<Campaign> {
  const { data } = await apiClient.patch<Campaign>(`/campaigns/${encodeURIComponent(id)}/schedule`, body);
  return data;
}

/** PATCH /campaigns/:id/cancel */
export async function cancel(id: string): Promise<Campaign> {
  const { data } = await apiClient.patch<Campaign>(`/campaigns/${encodeURIComponent(id)}/cancel`, undefined);
  return data;
}

/** PATCH /campaigns/:id/send */
export async function send(id: string): Promise<Campaign> {
  const { data } = await apiClient.patch<Campaign>(`/campaigns/${encodeURIComponent(id)}/send`, undefined);
  return data;
}

/** GET /campaigns/:id/statistics */
export async function getStatistics(id: string): Promise<{ status: CampaignStatus; recipient_count: number; sent_at?: string }> {
  const { data } = await apiClient.get<{ status: CampaignStatus; recipient_count: number; sent_at?: string }>(`/campaigns/${encodeURIComponent(id)}/statistics`);
  return data;
}

/** DELETE /campaigns/:id */
export async function remove(id: string): Promise<Campaign> {
  const { data } = await apiClient.delete<Campaign>(`/campaigns/${encodeURIComponent(id)}`);
  return data;
}
