// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/housekeeping/controllers/housekeeping.controller.ts
// =============================================================================

import { apiClient } from "./client";
import type { CreateHousekeepingDto, Housekeeping, PaginatedResult, PaginationQueryDto, UpdateHousekeepingDto } from "@/types/api";

/** POST /housekeeping */
export async function create(body: CreateHousekeepingDto): Promise<Housekeeping> {
  const { data } = await apiClient.post<Housekeeping>("/housekeeping", body);
  return data;
}

/** GET /housekeeping */
export async function findAll(query?: PaginationQueryDto): Promise<PaginatedResult<Housekeeping>> {
  const { data } = await apiClient.get<PaginatedResult<Housekeeping>>("/housekeeping", { params: query });
  return data;
}

/** GET /housekeeping/property/:propertyId/pending */
export async function getPendingTasks(propertyId: string): Promise<Housekeeping[]> {
  const { data } = await apiClient.get<Housekeeping[]>(`/housekeeping/property/${encodeURIComponent(propertyId)}/pending`);
  return data;
}

/** GET /housekeeping/staff/:staffId */
export async function getTasksByStaff(staffId: string, query?: { date?: string }): Promise<Housekeeping[]> {
  const { data } = await apiClient.get<Housekeeping[]>(`/housekeeping/staff/${encodeURIComponent(staffId)}`, { params: query });
  return data;
}

/** GET /housekeeping/room/:roomId */
export async function getTasksByRoom(roomId: string): Promise<Housekeeping[]> {
  const { data } = await apiClient.get<Housekeeping[]>(`/housekeeping/room/${encodeURIComponent(roomId)}`);
  return data;
}

/** GET /housekeeping/:id */
export async function findOne(id: string): Promise<Housekeeping> {
  const { data } = await apiClient.get<Housekeeping>(`/housekeeping/${encodeURIComponent(id)}`);
  return data;
}

/** PATCH /housekeeping/:id */
export async function update(id: string, body: UpdateHousekeepingDto = {}): Promise<Housekeeping> {
  const { data } = await apiClient.patch<Housekeeping>(`/housekeeping/${encodeURIComponent(id)}`, body);
  return data;
}

/** PATCH /housekeeping/:id/assign */
export async function assignTask(id: string, body: { staff_id: string }): Promise<Housekeeping> {
  const { data } = await apiClient.patch<Housekeeping>(`/housekeeping/${encodeURIComponent(id)}/assign`, body);
  return data;
}

/** PATCH /housekeeping/:id/start */
export async function startTask(id: string): Promise<Housekeeping> {
  const { data } = await apiClient.patch<Housekeeping>(`/housekeeping/${encodeURIComponent(id)}/start`, undefined);
  return data;
}

/** PATCH /housekeeping/:id/complete */
export async function completeTask(id: string, body: { photos?: string[] } = {}): Promise<Housekeeping> {
  const { data } = await apiClient.patch<Housekeeping>(`/housekeeping/${encodeURIComponent(id)}/complete`, body);
  return data;
}

/** PATCH /housekeeping/:id/skip */
export async function skipTask(id: string, body: { reason?: string } = {}): Promise<Housekeeping> {
  const { data } = await apiClient.patch<Housekeeping>(`/housekeeping/${encodeURIComponent(id)}/skip`, body);
  return data;
}

/** DELETE /housekeeping/:id */
export async function remove(id: string): Promise<Housekeeping> {
  const { data } = await apiClient.delete<Housekeeping>(`/housekeeping/${encodeURIComponent(id)}`);
  return data;
}
