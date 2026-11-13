// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/room-type/controllers/room-type.controller.ts
// =============================================================================

import { apiClient } from "./client";
import type { CreateRoomTypeDto, PaginatedResult, PaginationQueryDto, Room, RoomType, UpdateRoomTypeDto } from "@/types/api";

/** POST /room-types */
export async function create(body: CreateRoomTypeDto): Promise<RoomType> {
  const { data } = await apiClient.post<RoomType>("/room-types", body);
  return data;
}

/** GET /room-types */
export async function findAll(query?: PaginationQueryDto): Promise<PaginatedResult<RoomType>> {
  const { data } = await apiClient.get<PaginatedResult<RoomType>>("/room-types", { params: query });
  return data;
}

/** GET /room-types/property/:propertyId */
export async function findByProperty(propertyId: string, query?: PaginationQueryDto): Promise<PaginatedResult<RoomType>> {
  const { data } = await apiClient.get<PaginatedResult<RoomType>>(`/room-types/property/${encodeURIComponent(propertyId)}`, { params: query });
  return data;
}

/** GET /room-types/:id */
export async function findOne(id: string): Promise<RoomType> {
  const { data } = await apiClient.get<RoomType>(`/room-types/${encodeURIComponent(id)}`);
  return data;
}

/** PATCH /room-types/:id */
export async function update(id: string, body: UpdateRoomTypeDto = {}): Promise<RoomType> {
  const { data } = await apiClient.patch<RoomType>(`/room-types/${encodeURIComponent(id)}`, body);
  return data;
}

/** DELETE /room-types/:id */
export async function remove(id: string): Promise<RoomType> {
  const { data } = await apiClient.delete<RoomType>(`/room-types/${encodeURIComponent(id)}`);
  return data;
}

/** PATCH /room-types/:id/base-price */
export async function updateBasePrice(id: string, body: { amount: number; currency?: string }): Promise<RoomType> {
  const { data } = await apiClient.patch<RoomType>(`/room-types/${encodeURIComponent(id)}/base-price`, body);
  return data;
}

/** GET /room-types/:id/rooms */
export async function getRooms(id: string): Promise<Room[]> {
  const { data } = await apiClient.get<Room[]>(`/room-types/${encodeURIComponent(id)}/rooms`);
  return data;
}
