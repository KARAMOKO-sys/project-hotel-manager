// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/reservation/controllers/reservation.controller.ts
// =============================================================================

import { apiClient } from "./client";
import type { CreateReservationDto, PaginatedResult, PaginationQueryDto, Reservation, UpdateReservationDto } from "@/types/api";

/** POST /reservations */
export async function create(body: CreateReservationDto): Promise<Reservation> {
  const { data } = await apiClient.post<Reservation>("/reservations", body);
  return data;
}

/** GET /reservations */
export async function findAll(query?: PaginationQueryDto): Promise<PaginatedResult<Reservation>> {
  const { data } = await apiClient.get<PaginatedResult<Reservation>>("/reservations", { params: query });
  return data;
}

/** GET /reservations/code/:code */
export async function findByConfirmationCode(code: string): Promise<Reservation> {
  const { data } = await apiClient.get<Reservation>(`/reservations/code/${encodeURIComponent(code)}`);
  return data;
}

/** GET /reservations/guest/:guestId */
export async function findByGuest(guestId: string, query?: PaginationQueryDto): Promise<PaginatedResult<Reservation>> {
  const { data } = await apiClient.get<PaginatedResult<Reservation>>(`/reservations/guest/${encodeURIComponent(guestId)}`, { params: query });
  return data;
}

/** GET /reservations/property/:propertyId/arrivals */
export async function getUpcomingArrivals(propertyId: string, query?: { days?: number }): Promise<Reservation[]> {
  const { data } = await apiClient.get<Reservation[]>(`/reservations/property/${encodeURIComponent(propertyId)}/arrivals`, { params: query });
  return data;
}

/** GET /reservations/property/:propertyId/departures */
export async function getDepartures(propertyId: string, query?: { date?: string }): Promise<Reservation[]> {
  const { data } = await apiClient.get<Reservation[]>(`/reservations/property/${encodeURIComponent(propertyId)}/departures`, { params: query });
  return data;
}

/** GET /reservations/:id */
export async function findOne(id: string): Promise<Reservation> {
  const { data } = await apiClient.get<Reservation>(`/reservations/${encodeURIComponent(id)}`);
  return data;
}

/** PATCH /reservations/:id */
export async function update(id: string, body: UpdateReservationDto = {}): Promise<Reservation> {
  const { data } = await apiClient.patch<Reservation>(`/reservations/${encodeURIComponent(id)}`, body);
  return data;
}

/** PATCH /reservations/:id/confirm */
export async function confirm(id: string): Promise<Reservation> {
  const { data } = await apiClient.patch<Reservation>(`/reservations/${encodeURIComponent(id)}/confirm`, undefined);
  return data;
}

/** PATCH /reservations/:id/cancel */
export async function cancel(id: string, body: { reason?: string } = {}): Promise<Reservation> {
  const { data } = await apiClient.patch<Reservation>(`/reservations/${encodeURIComponent(id)}/cancel`, body);
  return data;
}

/** PATCH /reservations/:id/check-in */
export async function checkIn(id: string): Promise<Reservation> {
  const { data } = await apiClient.patch<Reservation>(`/reservations/${encodeURIComponent(id)}/check-in`, undefined);
  return data;
}

/** PATCH /reservations/:id/check-out */
export async function checkOut(id: string): Promise<Reservation> {
  const { data } = await apiClient.patch<Reservation>(`/reservations/${encodeURIComponent(id)}/check-out`, undefined);
  return data;
}

/** PATCH /reservations/:id/no-show */
export async function markAsNoShow(id: string): Promise<Reservation> {
  const { data } = await apiClient.patch<Reservation>(`/reservations/${encodeURIComponent(id)}/no-show`, undefined);
  return data;
}

/** DELETE /reservations/:id */
export async function remove(id: string): Promise<Reservation> {
  const { data } = await apiClient.delete<Reservation>(`/reservations/${encodeURIComponent(id)}`);
  return data;
}
