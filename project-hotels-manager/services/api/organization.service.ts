// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/organization/controllers/organization.controller.ts
// =============================================================================

import { apiClient } from "./client";
import type { AddMemberDto, CreateOrganizationDto, Organization, OrganizationMember, PaginatedResult, PaginationQueryDto, UpdateOrganizationDto } from "@/types/api";

/** POST /organizations */
export async function create(body: CreateOrganizationDto): Promise<Organization> {
  const { data } = await apiClient.post<Organization>("/organizations", body);
  return data;
}

/** GET /organizations */
export async function findAll(query?: PaginationQueryDto): Promise<PaginatedResult<Organization>> {
  const { data } = await apiClient.get<PaginatedResult<Organization>>("/organizations", { params: query });
  return data;
}

/** GET /organizations/:id */
export async function findOne(id: string): Promise<Organization> {
  const { data } = await apiClient.get<Organization>(`/organizations/${encodeURIComponent(id)}`);
  return data;
}

/** PATCH /organizations/:id */
export async function update(id: string, body: UpdateOrganizationDto = {}): Promise<Organization> {
  const { data } = await apiClient.patch<Organization>(`/organizations/${encodeURIComponent(id)}`, body);
  return data;
}

/** DELETE /organizations/:id */
export async function remove(id: string): Promise<Organization> {
  const { data } = await apiClient.delete<Organization>(`/organizations/${encodeURIComponent(id)}`);
  return data;
}

/** GET /organizations/:id/settings */
export async function getSettings(id: string): Promise<Record<string, unknown>> {
  const { data } = await apiClient.get<Record<string, unknown>>(`/organizations/${encodeURIComponent(id)}/settings`);
  return data;
}

/** PATCH /organizations/:id/settings */
export async function updateSettings(id: string, body: Record<string, unknown> = {}): Promise<Organization> {
  const { data } = await apiClient.patch<Organization>(`/organizations/${encodeURIComponent(id)}/settings`, body);
  return data;
}

/** GET /organizations/:id/members */
export async function getMembers(id: string): Promise<OrganizationMember[]> {
  const { data } = await apiClient.get<OrganizationMember[]>(`/organizations/${encodeURIComponent(id)}/members`);
  return data;
}

/** POST /organizations/:id/members */
export async function addMember(id: string, body: AddMemberDto): Promise<Organization> {
  const { data } = await apiClient.post<Organization>(`/organizations/${encodeURIComponent(id)}/members`, body);
  return data;
}

/** DELETE /organizations/:id/members/:userId */
export async function removeMember(id: string, userId: string): Promise<Organization> {
  const { data } = await apiClient.delete<Organization>(`/organizations/${encodeURIComponent(id)}/members/${encodeURIComponent(userId)}`);
  return data;
}

/** GET /organizations/:id/statistics */
export async function getStatistics(id: string): Promise<{ member_count: number; status: string; type: string }> {
  const { data } = await apiClient.get<{ member_count: number; status: string; type: string }>(`/organizations/${encodeURIComponent(id)}/statistics`);
  return data;
}
