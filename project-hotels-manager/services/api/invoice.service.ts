// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/invoice/controllers/invoice.controller.ts
// =============================================================================

import { apiClient } from "./client";
import type { CreateInvoiceDto, CreateInvoiceItemDto, Invoice, PaginatedResult, PaginationQueryDto, UpdateInvoiceDto } from "@/types/api";

/** POST /invoices */
export async function create(body: CreateInvoiceDto = {}): Promise<Invoice> {
  const { data } = await apiClient.post<Invoice>("/invoices", body);
  return data;
}

/** GET /invoices */
export async function findAll(query?: PaginationQueryDto): Promise<PaginatedResult<Invoice>> {
  const { data } = await apiClient.get<PaginatedResult<Invoice>>("/invoices", { params: query });
  return data;
}

/** GET /invoices/reservation/:reservationId */
export async function findByReservation(reservationId: string, query?: PaginationQueryDto): Promise<PaginatedResult<Invoice>> {
  const { data } = await apiClient.get<PaginatedResult<Invoice>>(`/invoices/reservation/${encodeURIComponent(reservationId)}`, { params: query });
  return data;
}

/** GET /invoices/guest/:guestId */
export async function findByGuest(guestId: string, query?: PaginationQueryDto): Promise<PaginatedResult<Invoice>> {
  const { data } = await apiClient.get<PaginatedResult<Invoice>>(`/invoices/guest/${encodeURIComponent(guestId)}`, { params: query });
  return data;
}

/** GET /invoices/property/:propertyId/outstanding */
export async function getOutstandingInvoices(propertyId: string): Promise<Invoice[]> {
  const { data } = await apiClient.get<Invoice[]>(`/invoices/property/${encodeURIComponent(propertyId)}/outstanding`);
  return data;
}

/** GET /invoices/:id */
export async function findOne(id: string): Promise<Invoice> {
  const { data } = await apiClient.get<Invoice>(`/invoices/${encodeURIComponent(id)}`);
  return data;
}

/** PATCH /invoices/:id */
export async function update(id: string, body: UpdateInvoiceDto = {}): Promise<Invoice> {
  const { data } = await apiClient.patch<Invoice>(`/invoices/${encodeURIComponent(id)}`, body);
  return data;
}

/** PATCH /invoices/:id/paid */
export async function markAsPaid(id: string): Promise<Invoice> {
  const { data } = await apiClient.patch<Invoice>(`/invoices/${encodeURIComponent(id)}/paid`, undefined);
  return data;
}

/** PATCH /invoices/:id/overdue */
export async function markAsOverdue(id: string): Promise<Invoice> {
  const { data } = await apiClient.patch<Invoice>(`/invoices/${encodeURIComponent(id)}/overdue`, undefined);
  return data;
}

/** PATCH /invoices/:id/cancel */
export async function markAsCancelled(id: string): Promise<Invoice> {
  const { data } = await apiClient.patch<Invoice>(`/invoices/${encodeURIComponent(id)}/cancel`, undefined);
  return data;
}

/** POST /invoices/:id/items */
export async function addItem(id: string, body: CreateInvoiceItemDto): Promise<Invoice> {
  const { data } = await apiClient.post<Invoice>(`/invoices/${encodeURIComponent(id)}/items`, body);
  return data;
}

/** DELETE /invoices/:id/items/:itemId */
export async function removeItem(id: string, itemId: string): Promise<Invoice> {
  const { data } = await apiClient.delete<Invoice>(`/invoices/${encodeURIComponent(id)}/items/${encodeURIComponent(itemId)}`);
  return data;
}

/** DELETE /invoices/:id */
export async function remove(id: string): Promise<Invoice> {
  const { data } = await apiClient.delete<Invoice>(`/invoices/${encodeURIComponent(id)}`);
  return data;
}
