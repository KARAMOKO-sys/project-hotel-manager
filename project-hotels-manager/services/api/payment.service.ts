// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/payment/controllers/payment.controller.ts
// =============================================================================

import { apiClient } from "./client";
import type { CreatePaymentDto, PaginatedResult, PaginationQueryDto, Payment, UpdatePaymentDto } from "@/types/api";

/** POST /payments */
export async function create(body: CreatePaymentDto): Promise<Payment> {
  const { data } = await apiClient.post<Payment>("/payments", body);
  return data;
}

/** GET /payments */
export async function findAll(query?: PaginationQueryDto): Promise<PaginatedResult<Payment>> {
  const { data } = await apiClient.get<PaginatedResult<Payment>>("/payments", { params: query });
  return data;
}

/** GET /payments/transaction/:transactionId */
export async function findByTransactionId(transactionId: string): Promise<Payment> {
  const { data } = await apiClient.get<Payment>(`/payments/transaction/${encodeURIComponent(transactionId)}`);
  return data;
}

/** GET /payments/reservation/:reservationId */
export async function findByReservation(reservationId: string, query?: PaginationQueryDto): Promise<PaginatedResult<Payment>> {
  const { data } = await apiClient.get<PaginatedResult<Payment>>(`/payments/reservation/${encodeURIComponent(reservationId)}`, { params: query });
  return data;
}

/** GET /payments/guest/:guestId */
export async function findByGuest(guestId: string, query?: PaginationQueryDto): Promise<PaginatedResult<Payment>> {
  const { data } = await apiClient.get<PaginatedResult<Payment>>(`/payments/guest/${encodeURIComponent(guestId)}`, { params: query });
  return data;
}

/** GET /payments/property/:propertyId/cashup */
export async function getDailyCashup(propertyId: string, query?: { date?: string }): Promise<{ date: string; total: number; count: number }> {
  const { data } = await apiClient.get<{ date: string; total: number; count: number }>(`/payments/property/${encodeURIComponent(propertyId)}/cashup`, { params: query });
  return data;
}

/** GET /payments/:id */
export async function findOne(id: string): Promise<Payment> {
  const { data } = await apiClient.get<Payment>(`/payments/${encodeURIComponent(id)}`);
  return data;
}

/** PATCH /payments/:id */
export async function update(id: string, body: UpdatePaymentDto = {}): Promise<Payment> {
  const { data } = await apiClient.patch<Payment>(`/payments/${encodeURIComponent(id)}`, body);
  return data;
}

/** PATCH /payments/:id/complete */
export async function markAsCompleted(id: string): Promise<Payment> {
  const { data } = await apiClient.patch<Payment>(`/payments/${encodeURIComponent(id)}/complete`, undefined);
  return data;
}

/** PATCH /payments/:id/refund */
export async function refund(id: string, body: { amount: number; reason?: string }): Promise<Payment> {
  const { data } = await apiClient.patch<Payment>(`/payments/${encodeURIComponent(id)}/refund`, body);
  return data;
}

/** DELETE /payments/:id */
export async function remove(id: string): Promise<Payment> {
  const { data } = await apiClient.delete<Payment>(`/payments/${encodeURIComponent(id)}`);
  return data;
}
