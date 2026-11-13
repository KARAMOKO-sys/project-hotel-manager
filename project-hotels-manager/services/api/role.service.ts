// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/role/controllers/role.controller.ts
// =============================================================================

import { apiClient } from "./client";
import type { CreateRoleDto, PermissionCheckResponseDto, PermissionDto, Role, UpdateRoleDto } from "@/types/api";

/** POST /roles */
export async function create(body: CreateRoleDto): Promise<Role> {
  const { data } = await apiClient.post<Role>("/roles", body);
  return data;
}

/** GET /roles */
export async function findAll(): Promise<Role[]> {
  const { data } = await apiClient.get<Role[]>("/roles");
  return data;
}

/** GET /roles/active */
export async function findActive(): Promise<Role[]> {
  const { data } = await apiClient.get<Role[]>("/roles/active");
  return data;
}

/** GET /roles/search */
export async function search(query: { q: string }): Promise<Role[]> {
  const { data } = await apiClient.get<Role[]>("/roles/search", { params: query });
  return data;
}

/** GET /roles/level/:level */
export async function findByLevel(level: string): Promise<Role[]> {
  const { data } = await apiClient.get<Role[]>(`/roles/level/${encodeURIComponent(level)}`);
  return data;
}

/** GET /roles/code/:code */
export async function findByCode(code: string): Promise<Role> {
  const { data } = await apiClient.get<Role>(`/roles/code/${encodeURIComponent(code)}`);
  return data;
}

/** GET /roles/:id */
export async function findOne(id: string): Promise<Role> {
  const { data } = await apiClient.get<Role>(`/roles/${encodeURIComponent(id)}`);
  return data;
}

/** GET /roles/:id/permissions */
export async function getPermissions(id: string): Promise<string[]> {
  const { data } = await apiClient.get<string[]>(`/roles/${encodeURIComponent(id)}/permissions`);
  return data;
}

/** PATCH /roles/:id */
export async function update(id: string, body: UpdateRoleDto = {}): Promise<Role> {
  const { data } = await apiClient.patch<Role>(`/roles/${encodeURIComponent(id)}`, body);
  return data;
}

/** POST /roles/:id/permissions */
export async function addPermission(id: string, body: { permission: string }): Promise<Role> {
  const { data } = await apiClient.post<Role>(`/roles/${encodeURIComponent(id)}/permissions`, body);
  return data;
}

/** DELETE /roles/:id/permissions */
export async function removePermission(id: string, body: { permission: string }): Promise<Role> {
  const { data } = await apiClient.delete<Role>(`/roles/${encodeURIComponent(id)}/permissions`, { data: body });
  return data;
}

/** POST /roles/:id/permissions/check */
export async function checkPermissions(id: string, body: PermissionDto): Promise<PermissionCheckResponseDto> {
  const { data } = await apiClient.post<PermissionCheckResponseDto>(`/roles/${encodeURIComponent(id)}/permissions/check`, body);
  return data;
}

/** DELETE /roles/:id */
export async function remove(id: string): Promise<Role> {
  const { data } = await apiClient.delete<Role>(`/roles/${encodeURIComponent(id)}`);
  return data;
}

/** GET /roles/stats/overview */
export async function getStats(): Promise<unknown> {
  const { data } = await apiClient.get<unknown>("/roles/stats/overview");
  return data;
}
