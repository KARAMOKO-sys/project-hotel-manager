// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/guest-request/controllers/guest-request.controller.ts
// =============================================================================

import { apiClient } from "./client";
import type { CreateGuestRequestDto, GuestRequest, PaginatedResult, PaginationQueryDto, UpdateGuestRequestDto } from "@/types/api";

/** POST /guest-requests */
export async function create(body: CreateGuestRequestDto): Promise<GuestRequest> {
  const { data } = await apiClient.post<GuestRequest>("/guest-requests", body);
  return data;
}

/** GET /guest-requests */
export async function findAll(query?: PaginationQueryDto): Promise<PaginatedResult<GuestRequest>> {
  const { data } = await apiClient.get<PaginatedResult<GuestRequest>>("/guest-requests", { params: query });
  return data;
}

/** GET /guest-requests/guest/:guestId */
export async function getRequestsByGuest(guestId: string): Promise<GuestRequest[]> {
  const { data } = await apiClient.get<GuestRequest[]>(`/guest-requests/guest/${encodeURIComponent(guestId)}`);
  return data;
}

/** GET /guest-requests/room/:roomId */
export async function getRequestsByRoom(roomId: string): Promise<GuestRequest[]> {
  const { data } = await apiClient.get<GuestRequest[]>(`/guest-requests/room/${encodeURIComponent(roomId)}`);
  return data;
}

/** GET /guest-requests/property/:propertyId/pending */
export async function getPendingRequests(propertyId: string): Promise<GuestRequest[]> {
  const { data } = await apiClient.get<GuestRequest[]>(`/guest-requests/property/${encodeURIComponent(propertyId)}/pending`);
  return data;
}

/** GET /guest-requests/:id */
export async function findOne(id: string): Promise<GuestRequest> {
  const { data } = await apiClient.get<GuestRequest>(`/guest-requests/${encodeURIComponent(id)}`);
  return data;
}

/** PATCH /guest-requests/:id */
export async function update(id: string, body: UpdateGuestRequestDto = {}): Promise<GuestRequest> {
  const { data } = await apiClient.patch<GuestRequest>(`/guest-requests/${encodeURIComponent(id)}`, body);
  return data;
}

/** PATCH /guest-requests/:id/assign */
export async function assign(id: string, body: { staff_id: string }): Promise<GuestRequest> {
  const { data } = await apiClient.patch<GuestRequest>(`/guest-requests/${encodeURIComponent(id)}/assign`, body);
  return data;
}

/** PATCH /guest-requests/:id/complete */
export async function complete(id: string): Promise<GuestRequest> {
  const { data } = await apiClient.patch<GuestRequest>(`/guest-requests/${encodeURIComponent(id)}/complete`, undefined);
  return data;
}

/** PATCH /guest-requests/:id/cancel */
export async function cancel(id: string, body: { reason?: string } = {}): Promise<GuestRequest> {
  const { data } = await apiClient.patch<GuestRequest>(`/guest-requests/${encodeURIComponent(id)}/cancel`, body);
  return data;
}

/** DELETE /guest-requests/:id */
export async function remove(id: string): Promise<GuestRequest> {
  const { data } = await apiClient.delete<GuestRequest>(`/guest-requests/${encodeURIComponent(id)}`);
  return data;
}
