// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/accountant/controllers/accountant.controller.ts
// =============================================================================

import { apiClient } from "./client";
import type { Accountant, AccountantCertificationDto, AccountantStatus, ApprovalCheckResult, ChangeAccountantPasswordDto, CreateAccountantDto, PaginatedResult, PaginationQueryDto, SuspendAccountantDto, UpdateAccountantDto, UpdateAccountantPermissionsDto } from "@/types/api";

/** POST /accountants */
export async function create(body: CreateAccountantDto): Promise<Accountant> {
  const { data } = await apiClient.post<Accountant>("/accountants", body);
  return data;
}

/** GET /accountants */
export async function findAll(query?: PaginationQueryDto): Promise<PaginatedResult<Accountant>> {
  const { data } = await apiClient.get<PaginatedResult<Accountant>>("/accountants", { params: query });
  return data;
}

/** GET /accountants/search */
export async function search(query: { q: string }): Promise<Accountant[]> {
  const { data } = await apiClient.get<Accountant[]>("/accountants/search", { params: query });
  return data;
}

/** GET /accountants/email/:email */
export async function findByEmail(email: string): Promise<Accountant> {
  const { data } = await apiClient.get<Accountant>(`/accountants/email/${encodeURIComponent(email)}`);
  return data;
}

/** GET /accountants/employee/:code */
export async function findByEmployeeCode(code: string): Promise<Accountant> {
  const { data } = await apiClient.get<Accountant>(`/accountants/employee/${encodeURIComponent(code)}`);
  return data;
}

/** GET /accountants/property/:propertyId */
export async function findByProperty(propertyId: string, query?: PaginationQueryDto & { status?: AccountantStatus }): Promise<PaginatedResult<Accountant>> {
  const { data } = await apiClient.get<PaginatedResult<Accountant>>(`/accountants/property/${encodeURIComponent(propertyId)}`, { params: query });
  return data;
}

/** GET /accountants/:id */
export async function findOne(id: string): Promise<Accountant> {
  const { data } = await apiClient.get<Accountant>(`/accountants/${encodeURIComponent(id)}`);
  return data;
}

/** GET /accountants/:id/approval-check */
export async function checkApproval(id: string, query: { amount: number }): Promise<ApprovalCheckResult> {
  const { data } = await apiClient.get<ApprovalCheckResult>(`/accountants/${encodeURIComponent(id)}/approval-check`, { params: query });
  return data;
}

/** PATCH /accountants/:id */
export async function update(id: string, body: UpdateAccountantDto = {}): Promise<Accountant> {
  const { data } = await apiClient.patch<Accountant>(`/accountants/${encodeURIComponent(id)}`, body);
  return data;
}

/** PATCH /accountants/:id/activate */
export async function activate(id: string): Promise<Accountant> {
  const { data } = await apiClient.patch<Accountant>(`/accountants/${encodeURIComponent(id)}/activate`, undefined);
  return data;
}

/** PATCH /accountants/:id/deactivate */
export async function deactivate(id: string): Promise<Accountant> {
  const { data } = await apiClient.patch<Accountant>(`/accountants/${encodeURIComponent(id)}/deactivate`, undefined);
  return data;
}

/** PATCH /accountants/:id/suspend */
export async function suspend(id: string, body: SuspendAccountantDto = {}): Promise<Accountant> {
  const { data } = await apiClient.patch<Accountant>(`/accountants/${encodeURIComponent(id)}/suspend`, body);
  return data;
}

/** PATCH /accountants/:id/reactivate */
export async function reactivate(id: string): Promise<Accountant> {
  const { data } = await apiClient.patch<Accountant>(`/accountants/${encodeURIComponent(id)}/reactivate`, undefined);
  return data;
}

/** PATCH /accountants/:id/password */
export async function changePassword(id: string, body: ChangeAccountantPasswordDto): Promise<Accountant> {
  const { data } = await apiClient.patch<Accountant>(`/accountants/${encodeURIComponent(id)}/password`, body);
  return data;
}

/** PATCH /accountants/:id/permissions */
export async function updatePermissions(id: string, body: UpdateAccountantPermissionsDto = {}): Promise<Accountant> {
  const { data } = await apiClient.patch<Accountant>(`/accountants/${encodeURIComponent(id)}/permissions`, body);
  return data;
}

/** POST /accountants/:id/certifications */
export async function addCertification(id: string, body: AccountantCertificationDto): Promise<Accountant> {
  const { data } = await apiClient.post<Accountant>(`/accountants/${encodeURIComponent(id)}/certifications`, body);
  return data;
}

/** DELETE /accountants/:id/certifications/:certification */
export async function removeCertification(id: string, certification: string): Promise<Accountant> {
  const { data } = await apiClient.delete<Accountant>(`/accountants/${encodeURIComponent(id)}/certifications/${encodeURIComponent(certification)}`);
  return data;
}

/** PATCH /accountants/:id/restore */
export async function restore(id: string): Promise<Accountant> {
  const { data } = await apiClient.patch<Accountant>(`/accountants/${encodeURIComponent(id)}/restore`, undefined);
  return data;
}

/** DELETE /accountants/:id */
export async function remove(id: string): Promise<Accountant> {
  const { data } = await apiClient.delete<Accountant>(`/accountants/${encodeURIComponent(id)}`);
  return data;
}
