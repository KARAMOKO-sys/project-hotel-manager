// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/reservation-room/controllers/reservation-room.controller.ts
// =============================================================================

import { apiClient } from "./client";
import type { CreateReservationRoomDto, PaginatedResult, PaginationQueryDto, ReservationRoom, UpdateReservationRoomDto } from "@/types/api";

/** POST /reservation-rooms */
export async function create(body: CreateReservationRoomDto): Promise<ReservationRoom> {
  const { data } = await apiClient.post<ReservationRoom>("/reservation-rooms", body);
  return data;
}

/** GET /reservation-rooms */
export async function findAll(query?: PaginationQueryDto): Promise<PaginatedResult<ReservationRoom>> {
  const { data } = await apiClient.get<PaginatedResult<ReservationRoom>>("/reservation-rooms", { params: query });
  return data;
}

/** GET /reservation-rooms/reservation/:reservationId */
export async function findByReservation(reservationId: string, query?: PaginationQueryDto): Promise<PaginatedResult<ReservationRoom>> {
  const { data } = await apiClient.get<PaginatedResult<ReservationRoom>>(`/reservation-rooms/reservation/${encodeURIComponent(reservationId)}`, { params: query });
  return data;
}

/** GET /reservation-rooms/:id */
export async function findOne(id: string): Promise<ReservationRoom> {
  const { data } = await apiClient.get<ReservationRoom>(`/reservation-rooms/${encodeURIComponent(id)}`);
  return data;
}

/** PATCH /reservation-rooms/:id */
export async function update(id: string, body: UpdateReservationRoomDto = {}): Promise<ReservationRoom> {
  const { data } = await apiClient.patch<ReservationRoom>(`/reservation-rooms/${encodeURIComponent(id)}`, body);
  return data;
}

/** DELETE /reservation-rooms/:id */
export async function remove(id: string): Promise<ReservationRoom> {
  const { data } = await apiClient.delete<ReservationRoom>(`/reservation-rooms/${encodeURIComponent(id)}`);
  return data;
}
