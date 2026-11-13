// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/maintenance-request/controllers/maintenance-request.controller.ts
// =============================================================================

import { apiClient } from "./client";
import type { CreateMaintenanceRequestDto, MaintenanceRequest, PaginatedResult, PaginationQueryDto, UpdateMaintenanceRequestDto } from "@/types/api";

/** POST /maintenance-requests */
export async function create(body: CreateMaintenanceRequestDto): Promise<MaintenanceRequest> {
  const { data } = await apiClient.post<MaintenanceRequest>("/maintenance-requests", body);
  return data;
}

/** GET /maintenance-requests */
export async function findAll(query?: PaginationQueryDto): Promise<PaginatedResult<MaintenanceRequest>> {
  const { data } = await apiClient.get<PaginatedResult<MaintenanceRequest>>("/maintenance-requests", { params: query });
  return data;
}

/** GET /maintenance-requests/property/:propertyId */
export async function getRequestsByProperty(propertyId: string): Promise<MaintenanceRequest[]> {
  const { data } = await apiClient.get<MaintenanceRequest[]>(`/maintenance-requests/property/${encodeURIComponent(propertyId)}`);
  return data;
}

/** GET /maintenance-requests/property/:propertyId/urgent */
export async function getUrgentRequests(propertyId: string): Promise<MaintenanceRequest[]> {
  const { data } = await apiClient.get<MaintenanceRequest[]>(`/maintenance-requests/property/${encodeURIComponent(propertyId)}/urgent`);
  return data;
}

/** GET /maintenance-requests/:id */
export async function findOne(id: string): Promise<MaintenanceRequest> {
  const { data } = await apiClient.get<MaintenanceRequest>(`/maintenance-requests/${encodeURIComponent(id)}`);
  return data;
}

/** PATCH /maintenance-requests/:id */
export async function update(id: string, body: UpdateMaintenanceRequestDto = {}): Promise<MaintenanceRequest> {
  const { data } = await apiClient.patch<MaintenanceRequest>(`/maintenance-requests/${encodeURIComponent(id)}`, body);
  return data;
}

/** PATCH /maintenance-requests/:id/assign */
export async function assignRequest(id: string, body: { staff_id: string }): Promise<MaintenanceRequest> {
  const { data } = await apiClient.patch<MaintenanceRequest>(`/maintenance-requests/${encodeURIComponent(id)}/assign`, body);
  return data;
}

/** PATCH /maintenance-requests/:id/start */
export async function startRequest(id: string): Promise<MaintenanceRequest> {
  const { data } = await apiClient.patch<MaintenanceRequest>(`/maintenance-requests/${encodeURIComponent(id)}/start`, undefined);
  return data;
}

/** PATCH /maintenance-requests/:id/complete */
export async function completeRequest(id: string, body: { resolution?: string } = {}): Promise<MaintenanceRequest> {
  const { data } = await apiClient.patch<MaintenanceRequest>(`/maintenance-requests/${encodeURIComponent(id)}/complete`, body);
  return data;
}

/** PATCH /maintenance-requests/:id/cancel */
export async function cancelRequest(id: string, body: { reason?: string } = {}): Promise<MaintenanceRequest> {
  const { data } = await apiClient.patch<MaintenanceRequest>(`/maintenance-requests/${encodeURIComponent(id)}/cancel`, body);
  return data;
}

/** DELETE /maintenance-requests/:id */
export async function remove(id: string): Promise<MaintenanceRequest> {
  const { data } = await apiClient.delete<MaintenanceRequest>(`/maintenance-requests/${encodeURIComponent(id)}`);
  return data;
}
