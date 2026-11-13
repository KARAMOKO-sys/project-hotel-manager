// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/daily-price/controllers/daily-price.controller.ts
// =============================================================================

import { apiClient } from "./client";
import type { BulkSetDailyPriceDto, BulkSetResult, CreateDailyPriceDto, DailyPrice, PaginatedResult, PaginationQueryDto, PriceCalendar, PriceCalendarQueryDto, StayPrice, StayPriceQueryDto, UpdateDailyPriceDto } from "@/types/api";

/** POST /daily-prices */
export async function create(body: CreateDailyPriceDto): Promise<DailyPrice> {
  const { data } = await apiClient.post<DailyPrice>("/daily-prices", body);
  return data;
}

/** PUT /daily-prices */
export async function setPrice(body: CreateDailyPriceDto): Promise<DailyPrice> {
  const { data } = await apiClient.put<DailyPrice>("/daily-prices", body);
  return data;
}

/** POST /daily-prices/bulk */
export async function bulkSetPrices(body: BulkSetDailyPriceDto): Promise<BulkSetResult> {
  const { data } = await apiClient.post<BulkSetResult>("/daily-prices/bulk", body);
  return data;
}

/** GET /daily-prices */
export async function findAll(query?: PaginationQueryDto): Promise<PaginatedResult<DailyPrice>> {
  const { data } = await apiClient.get<PaginatedResult<DailyPrice>>("/daily-prices", { params: query });
  return data;
}

/** GET /daily-prices/room-type/:roomTypeId/calendar */
export async function getCalendar(roomTypeId: string, query: PriceCalendarQueryDto): Promise<PriceCalendar> {
  const { data } = await apiClient.get<PriceCalendar>(`/daily-prices/room-type/${encodeURIComponent(roomTypeId)}/calendar`, { params: query });
  return data;
}

/** GET /daily-prices/room-type/:roomTypeId/stay */
export async function calculateStayPrice(roomTypeId: string, query: StayPriceQueryDto): Promise<StayPrice> {
  const { data } = await apiClient.get<StayPrice>(`/daily-prices/room-type/${encodeURIComponent(roomTypeId)}/stay`, { params: query });
  return data;
}

/** GET /daily-prices/room-type/:roomTypeId/date/:date */
export async function getPriceForDate(roomTypeId: string, date: string, query?: { rate_plan_id?: string }): Promise<DailyPrice> {
  const { data } = await apiClient.get<DailyPrice>(`/daily-prices/room-type/${encodeURIComponent(roomTypeId)}/date/${encodeURIComponent(date)}`, { params: query });
  return data;
}

/** GET /daily-prices/:id */
export async function findOne(id: string): Promise<DailyPrice> {
  const { data } = await apiClient.get<DailyPrice>(`/daily-prices/${encodeURIComponent(id)}`);
  return data;
}

/** PATCH /daily-prices/:id */
export async function update(id: string, body: UpdateDailyPriceDto = {}): Promise<DailyPrice> {
  const { data } = await apiClient.patch<DailyPrice>(`/daily-prices/${encodeURIComponent(id)}`, body);
  return data;
}

/** DELETE /daily-prices/:id */
export async function remove(id: string): Promise<DailyPrice> {
  const { data } = await apiClient.delete<DailyPrice>(`/daily-prices/${encodeURIComponent(id)}`);
  return data;
}
