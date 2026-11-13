// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/guest-preference/controllers/guest-preference.controller.ts
// =============================================================================

import { apiClient } from "./client";
import type { CreateGuestPreferenceDto, GuestPreference, PaginatedResult, PaginationQueryDto, UpdateGuestPreferenceDto } from "@/types/api";

/** POST /guest-preferences */
export async function create(body: CreateGuestPreferenceDto): Promise<GuestPreference> {
  const { data } = await apiClient.post<GuestPreference>("/guest-preferences", body);
  return data;
}

/** GET /guest-preferences */
export async function findAll(query?: PaginationQueryDto): Promise<PaginatedResult<GuestPreference>> {
  const { data } = await apiClient.get<PaginatedResult<GuestPreference>>("/guest-preferences", { params: query });
  return data;
}

/** GET /guest-preferences/guest/:guestId */
export async function findByGuest(guestId: string): Promise<GuestPreference[]> {
  const { data } = await apiClient.get<GuestPreference[]>(`/guest-preferences/guest/${encodeURIComponent(guestId)}`);
  return data;
}

/** GET /guest-preferences/guest/:guestId/recommendations */
export async function getRecommendations(guestId: string): Promise<GuestPreference[]> {
  const { data } = await apiClient.get<GuestPreference[]>(`/guest-preferences/guest/${encodeURIComponent(guestId)}/recommendations`);
  return data;
}

/** GET /guest-preferences/:id */
export async function findOne(id: string): Promise<GuestPreference> {
  const { data } = await apiClient.get<GuestPreference>(`/guest-preferences/${encodeURIComponent(id)}`);
  return data;
}

/** PATCH /guest-preferences/:id */
export async function update(id: string, body: UpdateGuestPreferenceDto = {}): Promise<GuestPreference> {
  const { data } = await apiClient.patch<GuestPreference>(`/guest-preferences/${encodeURIComponent(id)}`, body);
  return data;
}

/** PUT /guest-preferences/guest/:guestId/:preferenceType */
export async function updatePreference(guestId: string, preferenceType: string, body: { value?: string } = {}): Promise<GuestPreference> {
  const { data } = await apiClient.put<GuestPreference>(`/guest-preferences/guest/${encodeURIComponent(guestId)}/${encodeURIComponent(preferenceType)}`, body);
  return data;
}

/** DELETE /guest-preferences/guest/:guestId/:preferenceType */
export async function deletePreference(guestId: string, preferenceType: string): Promise<null | GuestPreference> {
  const { data } = await apiClient.delete<null | GuestPreference>(`/guest-preferences/guest/${encodeURIComponent(guestId)}/${encodeURIComponent(preferenceType)}`);
  return data;
}

/** DELETE /guest-preferences/:id */
export async function remove(id: string): Promise<GuestPreference> {
  const { data } = await apiClient.delete<GuestPreference>(`/guest-preferences/${encodeURIComponent(id)}`);
  return data;
}
