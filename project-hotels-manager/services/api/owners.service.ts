// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/owners/controllers/owners.controller.ts
// =============================================================================

import { apiClient } from "./client";
import type { AddOwnerRevenueDto, ChangeOwnerPasswordDto, CreateOwnerDto, Owner, OwnerProfileCompleteness, OwnerPropertyDto, OwnerSubscriptionStatus, PaginatedResult, PaginationQueryDto, RejectOwnerDto, SuspendOwnerDto, UpdateOwnerDto, UpdateOwnerSubscriptionDto, VerifyOwnerDto } from "@/types/api";

/** POST /owners */
export async function create(body: CreateOwnerDto): Promise<Owner> {
  const { data } = await apiClient.post<Owner>("/owners", body);
  return data;
}

/** GET /owners */
export async function findAll(query?: PaginationQueryDto): Promise<PaginatedResult<Owner>> {
  const { data } = await apiClient.get<PaginatedResult<Owner>>("/owners", { params: query });
  return data;
}

/** GET /owners/search */
export async function search(query: { q: string }): Promise<Owner[]> {
  const { data } = await apiClient.get<Owner[]>("/owners/search", { params: query });
  return data;
}

/** GET /owners/pending */
export async function findPendingVerification(query?: PaginationQueryDto): Promise<PaginatedResult<Owner>> {
  const { data } = await apiClient.get<PaginatedResult<Owner>>("/owners/pending", { params: query });
  return data;
}

/** GET /owners/expiring */
export async function findExpiringSubscriptions(query: { days: number }): Promise<Owner[]> {
  const { data } = await apiClient.get<Owner[]>("/owners/expiring", { params: query });
  return data;
}

/** GET /owners/status/:status */
export async function findByStatus(status: string, query?: PaginationQueryDto): Promise<PaginatedResult<Owner>> {
  const { data } = await apiClient.get<PaginatedResult<Owner>>(`/owners/status/${encodeURIComponent(status)}`, { params: query });
  return data;
}

/** GET /owners/email/:email */
export async function findByEmail(email: string): Promise<Owner> {
  const { data } = await apiClient.get<Owner>(`/owners/email/${encodeURIComponent(email)}`);
  return data;
}

/** GET /owners/property/:propertyId */
export async function findByProperty(propertyId: string): Promise<Owner> {
  const { data } = await apiClient.get<Owner>(`/owners/property/${encodeURIComponent(propertyId)}`);
  return data;
}

/** GET /owners/:id */
export async function findOne(id: string): Promise<Owner> {
  const { data } = await apiClient.get<Owner>(`/owners/${encodeURIComponent(id)}`);
  return data;
}

/** GET /owners/:id/subscription */
export async function getSubscriptionStatus(id: string): Promise<OwnerSubscriptionStatus> {
  const { data } = await apiClient.get<OwnerSubscriptionStatus>(`/owners/${encodeURIComponent(id)}/subscription`);
  return data;
}

/** GET /owners/:id/completeness */
export async function getProfileCompleteness(id: string): Promise<OwnerProfileCompleteness> {
  const { data } = await apiClient.get<OwnerProfileCompleteness>(`/owners/${encodeURIComponent(id)}/completeness`);
  return data;
}

/** PATCH /owners/:id */
export async function update(id: string, body: UpdateOwnerDto = {}): Promise<Owner> {
  const { data } = await apiClient.patch<Owner>(`/owners/${encodeURIComponent(id)}`, body);
  return data;
}

/** PATCH /owners/:id/verify */
export async function verify(id: string, body: VerifyOwnerDto = {}): Promise<Owner> {
  const { data } = await apiClient.patch<Owner>(`/owners/${encodeURIComponent(id)}/verify`, body);
  return data;
}

/** PATCH /owners/:id/reject */
export async function reject(id: string, body: RejectOwnerDto): Promise<Owner> {
  const { data } = await apiClient.patch<Owner>(`/owners/${encodeURIComponent(id)}/reject`, body);
  return data;
}

/** PATCH /owners/:id/suspend */
export async function suspend(id: string, body: SuspendOwnerDto = {}): Promise<Owner> {
  const { data } = await apiClient.patch<Owner>(`/owners/${encodeURIComponent(id)}/suspend`, body);
  return data;
}

/** PATCH /owners/:id/reactivate */
export async function reactivate(id: string): Promise<Owner> {
  const { data } = await apiClient.patch<Owner>(`/owners/${encodeURIComponent(id)}/reactivate`, undefined);
  return data;
}

/** PATCH /owners/:id/activate */
export async function activate(id: string): Promise<Owner> {
  const { data } = await apiClient.patch<Owner>(`/owners/${encodeURIComponent(id)}/activate`, undefined);
  return data;
}

/** PATCH /owners/:id/deactivate */
export async function deactivate(id: string): Promise<Owner> {
  const { data } = await apiClient.patch<Owner>(`/owners/${encodeURIComponent(id)}/deactivate`, undefined);
  return data;
}

/** PATCH /owners/:id/password */
export async function changePassword(id: string, body: ChangeOwnerPasswordDto): Promise<Owner> {
  const { data } = await apiClient.patch<Owner>(`/owners/${encodeURIComponent(id)}/password`, body);
  return data;
}

/** PATCH /owners/:id/subscription */
export async function updateSubscription(id: string, body: UpdateOwnerSubscriptionDto): Promise<Owner> {
  const { data } = await apiClient.patch<Owner>(`/owners/${encodeURIComponent(id)}/subscription`, body);
  return data;
}

/** POST /owners/:id/properties */
export async function addProperty(id: string, body: OwnerPropertyDto): Promise<Owner> {
  const { data } = await apiClient.post<Owner>(`/owners/${encodeURIComponent(id)}/properties`, body);
  return data;
}

/** DELETE /owners/:id/properties/:propertyId */
export async function removeProperty(id: string, propertyId: string): Promise<Owner> {
  const { data } = await apiClient.delete<Owner>(`/owners/${encodeURIComponent(id)}/properties/${encodeURIComponent(propertyId)}`);
  return data;
}

/** POST /owners/:id/revenue */
export async function addRevenue(id: string, body: AddOwnerRevenueDto): Promise<Owner> {
  const { data } = await apiClient.post<Owner>(`/owners/${encodeURIComponent(id)}/revenue`, body);
  return data;
}

/** PATCH /owners/:id/restore */
export async function restore(id: string): Promise<Owner> {
  const { data } = await apiClient.patch<Owner>(`/owners/${encodeURIComponent(id)}/restore`, undefined);
  return data;
}

/** DELETE /owners/:id */
export async function remove(id: string): Promise<Owner> {
  const { data } = await apiClient.delete<Owner>(`/owners/${encodeURIComponent(id)}`);
  return data;
}
