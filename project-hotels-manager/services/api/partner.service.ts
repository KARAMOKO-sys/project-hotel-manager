// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/partner/controllers/partner.controller.ts
// =============================================================================

import { apiClient } from "./client";
import type { ApprovePartnerDto, ChangePartnerPasswordDto, CommissionRateDto, CommissionResult, CreatePartnerDto, MaxPropertiesDto, PaginatedResult, PaginationQueryDto, Partner, PartnerPropertyDto, PartnerReasonDto, PartnerReviewDto, PartnerStatistics, RecordPartnerBookingDto, SuspendPartnerDto, UpdatePartnerDto } from "@/types/api";

/** POST /partners — Inscription d'un partenaire (statut « en attente »). */
export async function create(body: CreatePartnerDto): Promise<Partner> {
  const { data } = await apiClient.post<Partner>("/partners", body);
  return data;
}

/** GET /partners */
export async function findAll(query?: PaginationQueryDto): Promise<PaginatedResult<Partner>> {
  const { data } = await apiClient.get<PaginatedResult<Partner>>("/partners", { params: query });
  return data;
}

/** GET /partners/search */
export async function search(query: { q: string }): Promise<Partner[]> {
  const { data } = await apiClient.get<Partner[]>("/partners/search", { params: query });
  return data;
}

/** GET /partners/pending */
export async function findPending(query?: PaginationQueryDto): Promise<PaginatedResult<Partner>> {
  const { data } = await apiClient.get<PaginatedResult<Partner>>("/partners/pending", { params: query });
  return data;
}

/** GET /partners/stats */
export async function getStatistics(): Promise<PartnerStatistics> {
  const { data } = await apiClient.get<PartnerStatistics>("/partners/stats");
  return data;
}

/** GET /partners/status/:status */
export async function findByStatus(status: string, query?: PaginationQueryDto): Promise<PaginatedResult<Partner>> {
  const { data } = await apiClient.get<PaginatedResult<Partner>>(`/partners/status/${encodeURIComponent(status)}`, { params: query });
  return data;
}

/** GET /partners/type/:type */
export async function findByType(type: string, query?: PaginationQueryDto): Promise<PaginatedResult<Partner>> {
  const { data } = await apiClient.get<PaginatedResult<Partner>>(`/partners/type/${encodeURIComponent(type)}`, { params: query });
  return data;
}

/** GET /partners/email/:email */
export async function findByEmail(email: string): Promise<Partner> {
  const { data } = await apiClient.get<Partner>(`/partners/email/${encodeURIComponent(email)}`);
  return data;
}

/** GET /partners/:id */
export async function findOne(id: string): Promise<Partner> {
  const { data } = await apiClient.get<Partner>(`/partners/${encodeURIComponent(id)}`);
  return data;
}

/** GET /partners/:id/commission */
export async function calculateCommission(id: string, query: { amount: number }): Promise<CommissionResult> {
  const { data } = await apiClient.get<CommissionResult>(`/partners/${encodeURIComponent(id)}/commission`, { params: query });
  return data;
}

/** PATCH /partners/:id */
export async function update(id: string, body: UpdatePartnerDto = {}): Promise<Partner> {
  const { data } = await apiClient.patch<Partner>(`/partners/${encodeURIComponent(id)}`, body);
  return data;
}

/** PATCH /partners/:id/approve */
export async function approve(id: string, body: ApprovePartnerDto = {}): Promise<Partner> {
  const { data } = await apiClient.patch<Partner>(`/partners/${encodeURIComponent(id)}/approve`, body);
  return data;
}

/** PATCH /partners/:id/reject */
export async function reject(id: string, body: PartnerReasonDto): Promise<Partner> {
  const { data } = await apiClient.patch<Partner>(`/partners/${encodeURIComponent(id)}/reject`, body);
  return data;
}

/** PATCH /partners/:id/suspend */
export async function suspend(id: string, body: SuspendPartnerDto = {}): Promise<Partner> {
  const { data } = await apiClient.patch<Partner>(`/partners/${encodeURIComponent(id)}/suspend`, body);
  return data;
}

/** PATCH /partners/:id/reactivate */
export async function reactivate(id: string): Promise<Partner> {
  const { data } = await apiClient.patch<Partner>(`/partners/${encodeURIComponent(id)}/reactivate`, undefined);
  return data;
}

/** PATCH /partners/:id/block */
export async function block(id: string, body: PartnerReasonDto): Promise<Partner> {
  const { data } = await apiClient.patch<Partner>(`/partners/${encodeURIComponent(id)}/block`, body);
  return data;
}

/** PATCH /partners/:id/activate */
export async function activate(id: string): Promise<Partner> {
  const { data } = await apiClient.patch<Partner>(`/partners/${encodeURIComponent(id)}/activate`, undefined);
  return data;
}

/** PATCH /partners/:id/deactivate */
export async function deactivate(id: string): Promise<Partner> {
  const { data } = await apiClient.patch<Partner>(`/partners/${encodeURIComponent(id)}/deactivate`, undefined);
  return data;
}

/** PATCH /partners/:id/password */
export async function changePassword(id: string, body: ChangePartnerPasswordDto): Promise<Partner> {
  const { data } = await apiClient.patch<Partner>(`/partners/${encodeURIComponent(id)}/password`, body);
  return data;
}

/** PATCH /partners/:id/commission-rate */
export async function updateCommissionRate(id: string, body: CommissionRateDto): Promise<Partner> {
  const { data } = await apiClient.patch<Partner>(`/partners/${encodeURIComponent(id)}/commission-rate`, body);
  return data;
}

/** PATCH /partners/:id/max-properties */
export async function setMaxProperties(id: string, body: MaxPropertiesDto): Promise<Partner> {
  const { data } = await apiClient.patch<Partner>(`/partners/${encodeURIComponent(id)}/max-properties`, body);
  return data;
}

/** POST /partners/:id/bookings */
export async function recordBooking(id: string, body: RecordPartnerBookingDto): Promise<Partner> {
  const { data } = await apiClient.post<Partner>(`/partners/${encodeURIComponent(id)}/bookings`, body);
  return data;
}

/** POST /partners/:id/properties */
export async function addProperty(id: string, body: PartnerPropertyDto): Promise<Partner> {
  const { data } = await apiClient.post<Partner>(`/partners/${encodeURIComponent(id)}/properties`, body);
  return data;
}

/** DELETE /partners/:id/properties/:propertyId */
export async function removeProperty(id: string, propertyId: string): Promise<Partner> {
  const { data } = await apiClient.delete<Partner>(`/partners/${encodeURIComponent(id)}/properties/${encodeURIComponent(propertyId)}`);
  return data;
}

/** POST /partners/:id/reviews */
export async function addReview(id: string, body: PartnerReviewDto): Promise<Partner> {
  const { data } = await apiClient.post<Partner>(`/partners/${encodeURIComponent(id)}/reviews`, body);
  return data;
}

/** PATCH /partners/:id/restore */
export async function restore(id: string): Promise<Partner> {
  const { data } = await apiClient.patch<Partner>(`/partners/${encodeURIComponent(id)}/restore`, undefined);
  return data;
}

/** DELETE /partners/:id */
export async function remove(id: string): Promise<Partner> {
  const { data } = await apiClient.delete<Partner>(`/partners/${encodeURIComponent(id)}`);
  return data;
}
