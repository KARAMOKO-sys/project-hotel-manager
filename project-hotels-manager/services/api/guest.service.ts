// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/guest/controllers/guest.controller.ts
// =============================================================================

import { apiClient } from "./client";
import type { CreateGuestDto, Guest, PaginatedResult, PaginationQueryDto, UpdateGuestDto } from "@/types/api";

/** POST /guests */
export async function create(body: CreateGuestDto): Promise<Guest> {
  const { data } = await apiClient.post<Guest>("/guests", body);
  return data;
}

/** GET /guests */
export async function findAll(query?: PaginationQueryDto): Promise<PaginatedResult<Guest>> {
  const { data } = await apiClient.get<PaginatedResult<Guest>>("/guests", { params: query });
  return data;
}

/** GET /guests/search */
export async function search(query: { q: string }): Promise<Guest[]> {
  const { data } = await apiClient.get<Guest[]>("/guests/search", { params: query });
  return data;
}

/** GET /guests/email/:email */
export async function findByEmail(email: string): Promise<Guest> {
  const { data } = await apiClient.get<Guest>(`/guests/email/${encodeURIComponent(email)}`);
  return data;
}

/** GET /guests/:id */
export async function findOne(id: string): Promise<Guest> {
  const { data } = await apiClient.get<Guest>(`/guests/${encodeURIComponent(id)}`);
  return data;
}

/** PATCH /guests/:id */
export async function update(id: string, body: UpdateGuestDto = {}): Promise<Guest> {
  const { data } = await apiClient.patch<Guest>(`/guests/${encodeURIComponent(id)}`, body);
  return data;
}

/** PATCH /guests/:id/profile */
export async function updateProfile(id: string, body: UpdateGuestDto = {}): Promise<Guest> {
  const { data } = await apiClient.patch<Guest>(`/guests/${encodeURIComponent(id)}/profile`, body);
  return data;
}

/** PATCH /guests/:id/activate */
export async function activate(id: string): Promise<Guest> {
  const { data } = await apiClient.patch<Guest>(`/guests/${encodeURIComponent(id)}/activate`, undefined);
  return data;
}

/** PATCH /guests/:id/deactivate */
export async function deactivate(id: string): Promise<Guest> {
  const { data } = await apiClient.patch<Guest>(`/guests/${encodeURIComponent(id)}/deactivate`, undefined);
  return data;
}

/** POST /guests/:id/loyalty-points */
export async function addLoyaltyPoints(id: string, body: { points: number }): Promise<Guest> {
  const { data } = await apiClient.post<Guest>(`/guests/${encodeURIComponent(id)}/loyalty-points`, body);
  return data;
}

/** POST /guests/:id/loyalty-points/redeem */
export async function redeemLoyaltyPoints(id: string, body: { points: number }): Promise<Guest> {
  const { data } = await apiClient.post<Guest>(`/guests/${encodeURIComponent(id)}/loyalty-points/redeem`, body);
  return data;
}

/** GET /guests/:id/loyalty-history */
export async function getLoyaltyHistory(id: string): Promise<undefined | Array<{ date: string; action: string; description: string; points: number }>> {
  const { data } = await apiClient.get<undefined | Array<{ date: string; action: string; description: string; points: number }>>(`/guests/${encodeURIComponent(id)}/loyalty-history`);
  return data;
}

/** DELETE /guests/:id */
export async function remove(id: string): Promise<Guest> {
  const { data } = await apiClient.delete<Guest>(`/guests/${encodeURIComponent(id)}`);
  return data;
}
