// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/waitlist/controllers/waitlist.controller.ts
// =============================================================================

import { apiClient } from "./client";
import type { CancelWaitlistDto, ConvertWaitlistDto, CreateWaitlistDto, NotifyAvailabilityDto, PaginatedResult, PaginationQueryDto, UpdateWaitlistDto, Waitlist, WaitlistPosition, WaitlistQueryDto, WaitlistStatistics } from "@/types/api";

/** POST /waitlist */
export async function create(body: CreateWaitlistDto): Promise<Waitlist> {
  const { data } = await apiClient.post<Waitlist>("/waitlist", body);
  return data;
}

/** GET /waitlist */
export async function findAll(query?: PaginationQueryDto): Promise<PaginatedResult<Waitlist>> {
  const { data } = await apiClient.get<PaginatedResult<Waitlist>>("/waitlist", { params: query });
  return data;
}

/** POST /waitlist/expire-overdue */
export async function expireOverdue(): Promise<{ expired: number }> {
  const { data } = await apiClient.post<{ expired: number }>("/waitlist/expire-overdue", undefined);
  return data;
}

/** GET /waitlist/property/:propertyId */
export async function findByProperty(propertyId: string, query?: WaitlistQueryDto): Promise<PaginatedResult<Waitlist>> {
  const { data } = await apiClient.get<PaginatedResult<Waitlist>>(`/waitlist/property/${encodeURIComponent(propertyId)}`, { params: query });
  return data;
}

/** GET /waitlist/property/:propertyId/statistics */
export async function getStatistics(propertyId: string): Promise<WaitlistStatistics> {
  const { data } = await apiClient.get<WaitlistStatistics>(`/waitlist/property/${encodeURIComponent(propertyId)}/statistics`);
  return data;
}

/** POST /waitlist/property/:propertyId/notify */
export async function notifyAvailable(propertyId: string, body: NotifyAvailabilityDto): Promise<Waitlist[]> {
  const { data } = await apiClient.post<Waitlist[]>(`/waitlist/property/${encodeURIComponent(propertyId)}/notify`, body);
  return data;
}

/** GET /waitlist/guest/:guestId */
export async function findByGuest(guestId: string, query?: PaginationQueryDto): Promise<PaginatedResult<Waitlist>> {
  const { data } = await apiClient.get<PaginatedResult<Waitlist>>(`/waitlist/guest/${encodeURIComponent(guestId)}`, { params: query });
  return data;
}

/** GET /waitlist/:id */
export async function findOne(id: string): Promise<Waitlist> {
  const { data } = await apiClient.get<Waitlist>(`/waitlist/${encodeURIComponent(id)}`);
  return data;
}

/** GET /waitlist/:id/position */
export async function getPosition(id: string): Promise<WaitlistPosition> {
  const { data } = await apiClient.get<WaitlistPosition>(`/waitlist/${encodeURIComponent(id)}/position`);
  return data;
}

/** PATCH /waitlist/:id */
export async function update(id: string, body: UpdateWaitlistDto = {}): Promise<Waitlist> {
  const { data } = await apiClient.patch<Waitlist>(`/waitlist/${encodeURIComponent(id)}`, body);
  return data;
}

/** PATCH /waitlist/:id/confirm */
export async function confirm(id: string): Promise<Waitlist> {
  const { data } = await apiClient.patch<Waitlist>(`/waitlist/${encodeURIComponent(id)}/confirm`, undefined);
  return data;
}

/** PATCH /waitlist/:id/convert */
export async function convert(id: string, body: ConvertWaitlistDto): Promise<Waitlist> {
  const { data } = await apiClient.patch<Waitlist>(`/waitlist/${encodeURIComponent(id)}/convert`, body);
  return data;
}

/** PATCH /waitlist/:id/cancel */
export async function cancel(id: string, body: CancelWaitlistDto = {}): Promise<Waitlist> {
  const { data } = await apiClient.patch<Waitlist>(`/waitlist/${encodeURIComponent(id)}/cancel`, body);
  return data;
}

/** DELETE /waitlist/:id */
export async function remove(id: string): Promise<Waitlist> {
  const { data } = await apiClient.delete<Waitlist>(`/waitlist/${encodeURIComponent(id)}`);
  return data;
}
