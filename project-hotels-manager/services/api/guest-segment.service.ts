// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/guest-segment/controllers/guest-segment.controller.ts
// =============================================================================

import { apiClient } from "./client";
import type { CreateGuestSegmentDto, GuestSegment, PaginatedResult, PaginationQueryDto, UpdateGuestSegmentDto } from "@/types/api";

/** POST /guest-segments */
export async function create(body: CreateGuestSegmentDto): Promise<GuestSegment> {
  const { data } = await apiClient.post<GuestSegment>("/guest-segments", body);
  return data;
}

/** GET /guest-segments */
export async function findAll(query?: PaginationQueryDto): Promise<PaginatedResult<GuestSegment>> {
  const { data } = await apiClient.get<PaginatedResult<GuestSegment>>("/guest-segments", { params: query });
  return data;
}

/** GET /guest-segments/property/:propertyId */
export async function findByProperty(propertyId: string, query?: PaginationQueryDto): Promise<PaginatedResult<GuestSegment>> {
  const { data } = await apiClient.get<PaginatedResult<GuestSegment>>(`/guest-segments/property/${encodeURIComponent(propertyId)}`, { params: query });
  return data;
}

/** GET /guest-segments/:id */
export async function findOne(id: string): Promise<GuestSegment> {
  const { data } = await apiClient.get<GuestSegment>(`/guest-segments/${encodeURIComponent(id)}`);
  return data;
}

/** PATCH /guest-segments/:id */
export async function update(id: string, body: UpdateGuestSegmentDto = {}): Promise<GuestSegment> {
  const { data } = await apiClient.patch<GuestSegment>(`/guest-segments/${encodeURIComponent(id)}`, body);
  return data;
}

/** PATCH /guest-segments/:id/activate */
export async function activate(id: string): Promise<GuestSegment> {
  const { data } = await apiClient.patch<GuestSegment>(`/guest-segments/${encodeURIComponent(id)}/activate`, undefined);
  return data;
}

/** PATCH /guest-segments/:id/deactivate */
export async function deactivate(id: string): Promise<GuestSegment> {
  const { data } = await apiClient.patch<GuestSegment>(`/guest-segments/${encodeURIComponent(id)}/deactivate`, undefined);
  return data;
}

/** GET /guest-segments/:id/statistics */
export async function getStatistics(id: string): Promise<{ member_count: number; is_active: boolean; criteria: Record<string, unknown> }> {
  const { data } = await apiClient.get<{ member_count: number; is_active: boolean; criteria: Record<string, unknown> }>(`/guest-segments/${encodeURIComponent(id)}/statistics`);
  return data;
}

/** DELETE /guest-segments/:id */
export async function remove(id: string): Promise<GuestSegment> {
  const { data } = await apiClient.delete<GuestSegment>(`/guest-segments/${encodeURIComponent(id)}`);
  return data;
}
