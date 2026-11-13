// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/room/controllers/room.controller.ts
// =============================================================================

import { apiClient } from "./client";
import type { CreateRoomDto, PaginatedResult, PaginationQueryDto, Room, RoomStatus, UpdateRoomDto } from "@/types/api";

/** POST /rooms */
export async function create(body: CreateRoomDto): Promise<Room> {
  const { data } = await apiClient.post<Room>("/rooms", body);
  return data;
}

/** GET /rooms */
export async function findAll(query?: PaginationQueryDto): Promise<PaginatedResult<Room>> {
  const { data } = await apiClient.get<PaginatedResult<Room>>("/rooms", { params: query });
  return data;
}

/** GET /rooms/property/:propertyId */
export async function findByProperty(propertyId: string, query?: PaginationQueryDto): Promise<PaginatedResult<Room>> {
  const { data } = await apiClient.get<PaginatedResult<Room>>(`/rooms/property/${encodeURIComponent(propertyId)}`, { params: query });
  return data;
}

/** GET /rooms/property/:propertyId/available */
export async function getAvailableRooms(propertyId: string): Promise<Room[]> {
  const { data } = await apiClient.get<Room[]>(`/rooms/property/${encodeURIComponent(propertyId)}/available`);
  return data;
}

/** GET /rooms/property/:propertyId/maintenance */
export async function getMaintenanceRooms(propertyId: string): Promise<Room[]> {
  const { data } = await apiClient.get<Room[]>(`/rooms/property/${encodeURIComponent(propertyId)}/maintenance`);
  return data;
}

/** GET /rooms/:id */
export async function findOne(id: string): Promise<Room> {
  const { data } = await apiClient.get<Room>(`/rooms/${encodeURIComponent(id)}`);
  return data;
}

/** PATCH /rooms/:id */
export async function update(id: string, body: UpdateRoomDto = {}): Promise<Room> {
  const { data } = await apiClient.patch<Room>(`/rooms/${encodeURIComponent(id)}`, body);
  return data;
}

/** PATCH /rooms/:id/status */
export async function updateStatus(id: string, body: { status: RoomStatus }): Promise<Room> {
  const { data } = await apiClient.patch<Room>(`/rooms/${encodeURIComponent(id)}/status`, body);
  return data;
}

/** PATCH /rooms/:id/block */
export async function blockRoom(id: string, body: { reason?: string } = {}): Promise<Room> {
  const { data } = await apiClient.patch<Room>(`/rooms/${encodeURIComponent(id)}/block`, body);
  return data;
}

/** DELETE /rooms/:id */
export async function remove(id: string): Promise<Room> {
  const { data } = await apiClient.delete<Room>(`/rooms/${encodeURIComponent(id)}`);
  return data;
}
