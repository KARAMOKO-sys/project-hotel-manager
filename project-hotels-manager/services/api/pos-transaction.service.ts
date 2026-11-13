// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/pos-transaction/controllers/pos-transaction.controller.ts
// =============================================================================

import { apiClient } from "./client";
import type { CreatePosTransactionDto, PaginatedResult, PaginationQueryDto, PosDailySales, PosRoomCharges, PosTopSellingItem, PosTransaction, PosTransactionQueryDto, RefundPosTransactionDto, SettlePosTransactionDto, TopSellingQueryDto, UpdatePosTransactionDto, VoidPosTransactionDto } from "@/types/api";

/** POST /pos-transactions */
export async function create(body: CreatePosTransactionDto): Promise<PosTransaction> {
  const { data } = await apiClient.post<PosTransaction>("/pos-transactions", body);
  return data;
}

/** GET /pos-transactions */
export async function findAll(query?: PosTransactionQueryDto): Promise<PaginatedResult<PosTransaction>> {
  const { data } = await apiClient.get<PaginatedResult<PosTransaction>>("/pos-transactions", { params: query });
  return data;
}

/** GET /pos-transactions/number/:number */
export async function findByNumber(number: string): Promise<PosTransaction> {
  const { data } = await apiClient.get<PosTransaction>(`/pos-transactions/number/${encodeURIComponent(number)}`);
  return data;
}

/** GET /pos-transactions/reservation/:reservationId/room-charges */
export async function getRoomCharges(reservationId: string): Promise<PosRoomCharges> {
  const { data } = await apiClient.get<PosRoomCharges>(`/pos-transactions/reservation/${encodeURIComponent(reservationId)}/room-charges`);
  return data;
}

/** GET /pos-transactions/reservation/:reservationId */
export async function findByReservation(reservationId: string, query?: PaginationQueryDto): Promise<PaginatedResult<PosTransaction>> {
  const { data } = await apiClient.get<PaginatedResult<PosTransaction>>(`/pos-transactions/reservation/${encodeURIComponent(reservationId)}`, { params: query });
  return data;
}

/** GET /pos-transactions/guest/:guestId */
export async function findByGuest(guestId: string, query?: PaginationQueryDto): Promise<PaginatedResult<PosTransaction>> {
  const { data } = await apiClient.get<PaginatedResult<PosTransaction>>(`/pos-transactions/guest/${encodeURIComponent(guestId)}`, { params: query });
  return data;
}

/** GET /pos-transactions/property/:propertyId/daily-sales */
export async function getDailySales(propertyId: string, query?: { date?: string }): Promise<PosDailySales> {
  const { data } = await apiClient.get<PosDailySales>(`/pos-transactions/property/${encodeURIComponent(propertyId)}/daily-sales`, { params: query });
  return data;
}

/** GET /pos-transactions/property/:propertyId/top-items */
export async function getTopSellingItems(propertyId: string, query?: TopSellingQueryDto): Promise<PosTopSellingItem[]> {
  const { data } = await apiClient.get<PosTopSellingItem[]>(`/pos-transactions/property/${encodeURIComponent(propertyId)}/top-items`, { params: query });
  return data;
}

/** GET /pos-transactions/:id */
export async function findOne(id: string): Promise<PosTransaction> {
  const { data } = await apiClient.get<PosTransaction>(`/pos-transactions/${encodeURIComponent(id)}`);
  return data;
}

/** PATCH /pos-transactions/:id */
export async function update(id: string, body: UpdatePosTransactionDto = {}): Promise<PosTransaction> {
  const { data } = await apiClient.patch<PosTransaction>(`/pos-transactions/${encodeURIComponent(id)}`, body);
  return data;
}

/** PATCH /pos-transactions/:id/void */
export async function voidPosTransaction(id: string, body: VoidPosTransactionDto): Promise<PosTransaction> {
  const { data } = await apiClient.patch<PosTransaction>(`/pos-transactions/${encodeURIComponent(id)}/void`, body);
  return data;
}

/** PATCH /pos-transactions/:id/refund */
export async function refund(id: string, body: RefundPosTransactionDto = {}): Promise<PosTransaction> {
  const { data } = await apiClient.patch<PosTransaction>(`/pos-transactions/${encodeURIComponent(id)}/refund`, body);
  return data;
}

/** PATCH /pos-transactions/:id/settle */
export async function settle(id: string, body: SettlePosTransactionDto): Promise<PosTransaction> {
  const { data } = await apiClient.patch<PosTransaction>(`/pos-transactions/${encodeURIComponent(id)}/settle`, body);
  return data;
}

/** DELETE /pos-transactions/:id */
export async function remove(id: string): Promise<PosTransaction> {
  const { data } = await apiClient.delete<PosTransaction>(`/pos-transactions/${encodeURIComponent(id)}`);
  return data;
}
