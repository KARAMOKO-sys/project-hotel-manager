// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/blocked-date/controllers/blocked-date.controller.ts
// =============================================================================

import { apiClient } from "./client";
import type { BlockedDate, BlockedDateRangeQueryDto, CreateBlockedDateDto, PaginatedResult, PaginationQueryDto, UpdateBlockedDateDto } from "@/types/api";

/** POST /blocked-dates */
export async function create(body: CreateBlockedDateDto): Promise<BlockedDate> {
  const { data } = await apiClient.post<BlockedDate>("/blocked-dates", body);
  return data;
}

/** GET /blocked-dates */
export async function findAll(query?: PaginationQueryDto): Promise<PaginatedResult<BlockedDate>> {
  const { data } = await apiClient.get<PaginatedResult<BlockedDate>>("/blocked-dates", { params: query });
  return data;
}

/** GET /blocked-dates/property/:propertyId */
export async function findByProperty(propertyId: string, query?: PaginationQueryDto): Promise<PaginatedResult<BlockedDate>> {
  const { data } = await apiClient.get<PaginatedResult<BlockedDate>>(`/blocked-dates/property/${encodeURIComponent(propertyId)}`, { params: query });
  return data;
}

/** GET /blocked-dates/property/:propertyId/range */
export async function getBlockedDates(propertyId: string, query: BlockedDateRangeQueryDto): Promise<BlockedDate[]> {
  const { data } = await apiClient.get<BlockedDate[]>(`/blocked-dates/property/${encodeURIComponent(propertyId)}/range`, { params: query });
  return data;
}

/** GET /blocked-dates/property/:propertyId/check */
export async function isBlocked(propertyId: string, query: BlockedDateRangeQueryDto): Promise<{ blocked: boolean }> {
  const { data } = await apiClient.get<{ blocked: boolean }>(`/blocked-dates/property/${encodeURIComponent(propertyId)}/check`, { params: query });
  return data;
}

/** GET /blocked-dates/room/:roomId */
export async function findByRoom(roomId: string, query?: PaginationQueryDto): Promise<PaginatedResult<BlockedDate>> {
  const { data } = await apiClient.get<PaginatedResult<BlockedDate>>(`/blocked-dates/room/${encodeURIComponent(roomId)}`, { params: query });
  return data;
}

/** GET /blocked-dates/:id */
export async function findOne(id: string): Promise<BlockedDate> {
  const { data } = await apiClient.get<BlockedDate>(`/blocked-dates/${encodeURIComponent(id)}`);
  return data;
}

/** PATCH /blocked-dates/:id */
export async function update(id: string, body: UpdateBlockedDateDto = {}): Promise<BlockedDate> {
  const { data } = await apiClient.patch<BlockedDate>(`/blocked-dates/${encodeURIComponent(id)}`, body);
  return data;
}

/** PATCH /blocked-dates/:id/unblock */
export async function unblock(id: string): Promise<BlockedDate> {
  const { data } = await apiClient.patch<BlockedDate>(`/blocked-dates/${encodeURIComponent(id)}/unblock`, undefined);
  return data;
}

/** DELETE /blocked-dates/:id */
export async function remove(id: string): Promise<BlockedDate> {
  const { data } = await apiClient.delete<BlockedDate>(`/blocked-dates/${encodeURIComponent(id)}`);
  return data;
}
