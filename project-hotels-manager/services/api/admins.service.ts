// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/admins/controllers/admins.controller.ts
// =============================================================================

import { apiClient } from "./client";
import type { ChangeAdminPasswordDto, CreateAdminDto, PaginatedResult, PaginationQueryDto, SuperAdmin, SuspendAdminDto, UpdateAccessLevelDto, UpdateAdminDto, UpdateIpWhitelistDto } from "@/types/api";

/** POST /admins */
export async function create(body: CreateAdminDto): Promise<SuperAdmin> {
  const { data } = await apiClient.post<SuperAdmin>("/admins", body);
  return data;
}

/** GET /admins */
export async function findAll(query?: PaginationQueryDto): Promise<PaginatedResult<SuperAdmin>> {
  const { data } = await apiClient.get<PaginatedResult<SuperAdmin>>("/admins", { params: query });
  return data;
}

/** GET /admins/search */
export async function search(query: { q: string }): Promise<SuperAdmin[]> {
  const { data } = await apiClient.get<SuperAdmin[]>("/admins/search", { params: query });
  return data;
}

/** GET /admins/email/:email */
export async function findByEmail(email: string): Promise<SuperAdmin> {
  const { data } = await apiClient.get<SuperAdmin>(`/admins/email/${encodeURIComponent(email)}`);
  return data;
}

/** GET /admins/department/:department */
export async function findByDepartment(department: string, query?: PaginationQueryDto): Promise<PaginatedResult<SuperAdmin>> {
  const { data } = await apiClient.get<PaginatedResult<SuperAdmin>>(`/admins/department/${encodeURIComponent(department)}`, { params: query });
  return data;
}

/** GET /admins/access-level/:level */
export async function findByAccessLevel(level: string, query?: PaginationQueryDto): Promise<PaginatedResult<SuperAdmin>> {
  const { data } = await apiClient.get<PaginatedResult<SuperAdmin>>(`/admins/access-level/${encodeURIComponent(level)}`, { params: query });
  return data;
}

/** GET /admins/:id */
export async function findOne(id: string): Promise<SuperAdmin> {
  const { data } = await apiClient.get<SuperAdmin>(`/admins/${encodeURIComponent(id)}`);
  return data;
}

/** GET /admins/:id/alert-contact */
export async function getAlertContact(id: string): Promise<{ email?: string; phone?: string }> {
  const { data } = await apiClient.get<{ email?: string; phone?: string }>(`/admins/${encodeURIComponent(id)}/alert-contact`);
  return data;
}

/** GET /admins/:id/ip-allowed */
export async function isIpAllowed(id: string, query: { ip: string }): Promise<{ allowed: boolean }> {
  const { data } = await apiClient.get<{ allowed: boolean }>(`/admins/${encodeURIComponent(id)}/ip-allowed`, { params: query });
  return data;
}

/** PATCH /admins/:id */
export async function update(id: string, body: UpdateAdminDto = {}): Promise<SuperAdmin> {
  const { data } = await apiClient.patch<SuperAdmin>(`/admins/${encodeURIComponent(id)}`, body);
  return data;
}

/** PATCH /admins/:id/activate */
export async function activate(id: string): Promise<SuperAdmin> {
  const { data } = await apiClient.patch<SuperAdmin>(`/admins/${encodeURIComponent(id)}/activate`, undefined);
  return data;
}

/** PATCH /admins/:id/deactivate */
export async function deactivate(id: string): Promise<SuperAdmin> {
  const { data } = await apiClient.patch<SuperAdmin>(`/admins/${encodeURIComponent(id)}/deactivate`, undefined);
  return data;
}

/** PATCH /admins/:id/suspend */
export async function suspend(id: string, body: SuspendAdminDto = {}): Promise<SuperAdmin> {
  const { data } = await apiClient.patch<SuperAdmin>(`/admins/${encodeURIComponent(id)}/suspend`, body);
  return data;
}

/** PATCH /admins/:id/reactivate */
export async function reactivate(id: string): Promise<SuperAdmin> {
  const { data } = await apiClient.patch<SuperAdmin>(`/admins/${encodeURIComponent(id)}/reactivate`, undefined);
  return data;
}

/** PATCH /admins/:id/password */
export async function changePassword(id: string, body: ChangeAdminPasswordDto): Promise<SuperAdmin> {
  const { data } = await apiClient.patch<SuperAdmin>(`/admins/${encodeURIComponent(id)}/password`, body);
  return data;
}

/** PATCH /admins/:id/access-level */
export async function updateAccessLevel(id: string, body: UpdateAccessLevelDto): Promise<SuperAdmin> {
  const { data } = await apiClient.patch<SuperAdmin>(`/admins/${encodeURIComponent(id)}/access-level`, body);
  return data;
}

/** PATCH /admins/:id/ip-whitelist */
export async function updateIpWhitelist(id: string, body: UpdateIpWhitelistDto): Promise<SuperAdmin> {
  const { data } = await apiClient.patch<SuperAdmin>(`/admins/${encodeURIComponent(id)}/ip-whitelist`, body);
  return data;
}

/** PATCH /admins/:id/audit */
export async function markAudited(id: string): Promise<SuperAdmin> {
  const { data } = await apiClient.patch<SuperAdmin>(`/admins/${encodeURIComponent(id)}/audit`, undefined);
  return data;
}

/** PATCH /admins/:id/restore */
export async function restore(id: string): Promise<SuperAdmin> {
  const { data } = await apiClient.patch<SuperAdmin>(`/admins/${encodeURIComponent(id)}/restore`, undefined);
  return data;
}

/** DELETE /admins/:id */
export async function remove(id: string): Promise<SuperAdmin> {
  const { data } = await apiClient.delete<SuperAdmin>(`/admins/${encodeURIComponent(id)}`);
  return data;
}
