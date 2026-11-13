// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/ota-connection/controllers/ota-connection.controller.ts
// =============================================================================

import { apiClient } from "./client";
import type { CreateOtaConnectionDto, OtaConnection, OtaConnectionStatusSummary, OtaConnectionTestResult, PaginatedResult, PaginationQueryDto, RecordSyncDto, SetRoomMappingsDto, UpdateOtaConnectionDto, UpdateOtaCredentialsDto } from "@/types/api";

/** POST /ota-connections */
export async function create(body: CreateOtaConnectionDto): Promise<OtaConnection> {
  const { data } = await apiClient.post<OtaConnection>("/ota-connections", body);
  return data;
}

/** GET /ota-connections */
export async function findAll(query?: PaginationQueryDto): Promise<PaginatedResult<OtaConnection>> {
  const { data } = await apiClient.get<PaginatedResult<OtaConnection>>("/ota-connections", { params: query });
  return data;
}

/** GET /ota-connections/due-for-sync */
export async function findDueForSync(query?: { interval?: number }): Promise<OtaConnection[]> {
  const { data } = await apiClient.get<OtaConnection[]>("/ota-connections/due-for-sync", { params: query });
  return data;
}

/** GET /ota-connections/property/:propertyId/:provider/status */
export async function getConnectionStatus(propertyId: string, provider: string): Promise<OtaConnectionStatusSummary> {
  const { data } = await apiClient.get<OtaConnectionStatusSummary>(`/ota-connections/property/${encodeURIComponent(propertyId)}/${encodeURIComponent(provider)}/status`);
  return data;
}

/** GET /ota-connections/property/:propertyId/:provider */
export async function findByPropertyAndProvider(propertyId: string, provider: string): Promise<OtaConnection> {
  const { data } = await apiClient.get<OtaConnection>(`/ota-connections/property/${encodeURIComponent(propertyId)}/${encodeURIComponent(provider)}`);
  return data;
}

/** GET /ota-connections/property/:propertyId */
export async function findByProperty(propertyId: string): Promise<OtaConnection[]> {
  const { data } = await apiClient.get<OtaConnection[]>(`/ota-connections/property/${encodeURIComponent(propertyId)}`);
  return data;
}

/** GET /ota-connections/:id */
export async function findOne(id: string): Promise<OtaConnection> {
  const { data } = await apiClient.get<OtaConnection>(`/ota-connections/${encodeURIComponent(id)}`);
  return data;
}

/** PATCH /ota-connections/:id */
export async function update(id: string, body: UpdateOtaConnectionDto = {}): Promise<OtaConnection> {
  const { data } = await apiClient.patch<OtaConnection>(`/ota-connections/${encodeURIComponent(id)}`, body);
  return data;
}

/** PATCH /ota-connections/:id/credentials */
export async function updateCredentials(id: string, body: UpdateOtaCredentialsDto): Promise<OtaConnection> {
  const { data } = await apiClient.patch<OtaConnection>(`/ota-connections/${encodeURIComponent(id)}/credentials`, body);
  return data;
}

/** PATCH /ota-connections/:id/room-mappings */
export async function setRoomMappings(id: string, body: SetRoomMappingsDto): Promise<OtaConnection> {
  const { data } = await apiClient.patch<OtaConnection>(`/ota-connections/${encodeURIComponent(id)}/room-mappings`, body);
  return data;
}

/** DELETE /ota-connections/:id/room-mappings/:roomTypeId */
export async function removeRoomMapping(id: string, roomTypeId: string): Promise<OtaConnection> {
  const { data } = await apiClient.delete<OtaConnection>(`/ota-connections/${encodeURIComponent(id)}/room-mappings/${encodeURIComponent(roomTypeId)}`);
  return data;
}

/** PATCH /ota-connections/:id/enable */
export async function enable(id: string): Promise<OtaConnection> {
  const { data } = await apiClient.patch<OtaConnection>(`/ota-connections/${encodeURIComponent(id)}/enable`, undefined);
  return data;
}

/** PATCH /ota-connections/:id/disable */
export async function disable(id: string): Promise<OtaConnection> {
  const { data } = await apiClient.patch<OtaConnection>(`/ota-connections/${encodeURIComponent(id)}/disable`, undefined);
  return data;
}

/** POST /ota-connections/:id/test */
export async function testConnection(id: string): Promise<OtaConnectionTestResult> {
  const { data } = await apiClient.post<OtaConnectionTestResult>(`/ota-connections/${encodeURIComponent(id)}/test`, undefined);
  return data;
}

/** POST /ota-connections/:id/sync/start */
export async function startSync(id: string): Promise<OtaConnection> {
  const { data } = await apiClient.post<OtaConnection>(`/ota-connections/${encodeURIComponent(id)}/sync/start`, undefined);
  return data;
}

/** POST /ota-connections/:id/sync/result */
export async function recordSync(id: string, body: RecordSyncDto): Promise<OtaConnection> {
  const { data } = await apiClient.post<OtaConnection>(`/ota-connections/${encodeURIComponent(id)}/sync/result`, body);
  return data;
}

/** DELETE /ota-connections/:id */
export async function remove(id: string): Promise<OtaConnection> {
  const { data } = await apiClient.delete<OtaConnection>(`/ota-connections/${encodeURIComponent(id)}`);
  return data;
}
