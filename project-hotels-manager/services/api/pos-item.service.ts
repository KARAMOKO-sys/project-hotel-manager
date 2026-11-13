// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/pos-item/controllers/pos-item.controller.ts
// =============================================================================

import { apiClient } from "./client";
import type { AdjustStockDto, CreatePosItemDto, PaginatedResult, PosCategory, PosInventorySummary, PosItem, PosItemQueryDto, SetStockDto, UpdatePosItemDto } from "@/types/api";

/** POST /pos-items */
export async function create(body: CreatePosItemDto): Promise<PosItem> {
  const { data } = await apiClient.post<PosItem>("/pos-items", body);
  return data;
}

/** GET /pos-items */
export async function findAll(query?: PosItemQueryDto): Promise<PaginatedResult<PosItem>> {
  const { data } = await apiClient.get<PaginatedResult<PosItem>>("/pos-items", { params: query });
  return data;
}

/** GET /pos-items/property/:propertyId/catalog */
export async function getCatalog(propertyId: string, query?: { category?: PosCategory }): Promise<PosItem[]> {
  const { data } = await apiClient.get<PosItem[]>(`/pos-items/property/${encodeURIComponent(propertyId)}/catalog`, { params: query });
  return data;
}

/** GET /pos-items/property/:propertyId/inventory */
export async function getInventory(propertyId: string): Promise<PosInventorySummary> {
  const { data } = await apiClient.get<PosInventorySummary>(`/pos-items/property/${encodeURIComponent(propertyId)}/inventory`);
  return data;
}

/** GET /pos-items/property/:propertyId/low-stock */
export async function getLowStockItems(propertyId: string): Promise<PosItem[]> {
  const { data } = await apiClient.get<PosItem[]>(`/pos-items/property/${encodeURIComponent(propertyId)}/low-stock`);
  return data;
}

/** GET /pos-items/:id */
export async function findOne(id: string): Promise<PosItem> {
  const { data } = await apiClient.get<PosItem>(`/pos-items/${encodeURIComponent(id)}`);
  return data;
}

/** PATCH /pos-items/:id */
export async function update(id: string, body: UpdatePosItemDto = {}): Promise<PosItem> {
  const { data } = await apiClient.patch<PosItem>(`/pos-items/${encodeURIComponent(id)}`, body);
  return data;
}

/** PATCH /pos-items/:id/stock/adjust */
export async function adjustStock(id: string, body: AdjustStockDto): Promise<PosItem> {
  const { data } = await apiClient.patch<PosItem>(`/pos-items/${encodeURIComponent(id)}/stock/adjust`, body);
  return data;
}

/** PATCH /pos-items/:id/stock */
export async function setStock(id: string, body: SetStockDto): Promise<PosItem> {
  const { data } = await apiClient.patch<PosItem>(`/pos-items/${encodeURIComponent(id)}/stock`, body);
  return data;
}

/** PATCH /pos-items/:id/activate */
export async function activate(id: string): Promise<PosItem> {
  const { data } = await apiClient.patch<PosItem>(`/pos-items/${encodeURIComponent(id)}/activate`, undefined);
  return data;
}

/** PATCH /pos-items/:id/deactivate */
export async function deactivate(id: string): Promise<PosItem> {
  const { data } = await apiClient.patch<PosItem>(`/pos-items/${encodeURIComponent(id)}/deactivate`, undefined);
  return data;
}

/** PATCH /pos-items/:id/restore */
export async function restore(id: string): Promise<PosItem> {
  const { data } = await apiClient.patch<PosItem>(`/pos-items/${encodeURIComponent(id)}/restore`, undefined);
  return data;
}

/** DELETE /pos-items/:id */
export async function remove(id: string): Promise<PosItem> {
  const { data } = await apiClient.delete<PosItem>(`/pos-items/${encodeURIComponent(id)}`);
  return data;
}
