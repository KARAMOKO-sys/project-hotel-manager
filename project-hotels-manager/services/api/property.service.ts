// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/property/controllers/property.controller.ts
// =============================================================================

import { apiClient } from "./client";
import type { CreatePropertyDto, PaginatedResult, PaginationQueryDto, Property, PropertyQueryDto, PropertyType, Room, RoomType, UpdatePropertyDto } from "@/types/api";

/** POST /properties */
export async function create(body: CreatePropertyDto): Promise<Property> {
  const { data } = await apiClient.post<Property>("/properties", body);
  return data;
}

/** GET /properties */
export async function findAll(query?: PropertyQueryDto): Promise<PaginatedResult<Property>> {
  const { data } = await apiClient.get<PaginatedResult<Property>>("/properties", { params: query });
  return data;
}

/** GET /properties/stats/types */
export async function countByType(): Promise<Array<{ type: PropertyType; count: number }>> {
  const { data } = await apiClient.get<Array<{ type: PropertyType; count: number }>>("/properties/stats/types");
  return data;
}

/** GET /properties/cities */
export async function findCities(): Promise<string[]> {
  const { data } = await apiClient.get<string[]>("/properties/cities");
  return data;
}

/** GET /properties/organization/:organizationId */
export async function findByOrganization(organizationId: string, query?: PaginationQueryDto): Promise<PaginatedResult<Property>> {
  const { data } = await apiClient.get<PaginatedResult<Property>>(`/properties/organization/${encodeURIComponent(organizationId)}`, { params: query });
  return data;
}

/** GET /properties/owner/:ownerId */
export async function findByOwner(ownerId: string, query?: PaginationQueryDto): Promise<PaginatedResult<Property>> {
  const { data } = await apiClient.get<PaginatedResult<Property>>(`/properties/owner/${encodeURIComponent(ownerId)}`, { params: query });
  return data;
}

/** GET /properties/:id */
export async function findOne(id: string): Promise<Property> {
  const { data } = await apiClient.get<Property>(`/properties/${encodeURIComponent(id)}`);
  return data;
}

/** PATCH /properties/:id */
export async function update(id: string, body: UpdatePropertyDto = {}): Promise<Property> {
  const { data } = await apiClient.patch<Property>(`/properties/${encodeURIComponent(id)}`, body);
  return data;
}

/** DELETE /properties/:id */
export async function remove(id: string): Promise<Property> {
  const { data } = await apiClient.delete<Property>(`/properties/${encodeURIComponent(id)}`);
  return data;
}

/** GET /properties/:id/settings */
export async function getSettings(id: string): Promise<Record<string, unknown>> {
  const { data } = await apiClient.get<Record<string, unknown>>(`/properties/${encodeURIComponent(id)}/settings`);
  return data;
}

/** PATCH /properties/:id/settings */
export async function updateSettings(id: string, body: Record<string, unknown> = {}): Promise<Property> {
  const { data } = await apiClient.patch<Property>(`/properties/${encodeURIComponent(id)}/settings`, body);
  return data;
}

/** GET /properties/:id/rooms */
export async function getRooms(id: string): Promise<Room[]> {
  const { data } = await apiClient.get<Room[]>(`/properties/${encodeURIComponent(id)}/rooms`);
  return data;
}

/** GET /properties/:id/room-types */
export async function getRoomTypes(id: string): Promise<RoomType[]> {
  const { data } = await apiClient.get<RoomType[]>(`/properties/${encodeURIComponent(id)}/room-types`);
  return data;
}
