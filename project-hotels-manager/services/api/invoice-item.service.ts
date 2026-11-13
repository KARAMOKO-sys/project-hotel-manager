// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/invoice-item/controllers/invoice-item.controller.ts
// =============================================================================

import { apiClient } from "./client";
import type { CreateInvoiceItemDto, InvoiceItem, PaginatedResult, PaginationQueryDto, UpdateInvoiceItemDto } from "@/types/api";

/** POST /invoice-items */
export async function create(body: CreateInvoiceItemDto): Promise<InvoiceItem> {
  const { data } = await apiClient.post<InvoiceItem>("/invoice-items", body);
  return data;
}

/** GET /invoice-items */
export async function findAll(query?: PaginationQueryDto): Promise<PaginatedResult<InvoiceItem>> {
  const { data } = await apiClient.get<PaginatedResult<InvoiceItem>>("/invoice-items", { params: query });
  return data;
}

/** GET /invoice-items/invoice/:invoiceId */
export async function findByInvoice(invoiceId: string, query?: PaginationQueryDto): Promise<PaginatedResult<InvoiceItem>> {
  const { data } = await apiClient.get<PaginatedResult<InvoiceItem>>(`/invoice-items/invoice/${encodeURIComponent(invoiceId)}`, { params: query });
  return data;
}

/** GET /invoice-items/:id */
export async function findOne(id: string): Promise<InvoiceItem> {
  const { data } = await apiClient.get<InvoiceItem>(`/invoice-items/${encodeURIComponent(id)}`);
  return data;
}

/** PATCH /invoice-items/:id */
export async function update(id: string, body: UpdateInvoiceItemDto = {}): Promise<InvoiceItem> {
  const { data } = await apiClient.patch<InvoiceItem>(`/invoice-items/${encodeURIComponent(id)}`, body);
  return data;
}

/** DELETE /invoice-items/:id */
export async function remove(id: string): Promise<InvoiceItem> {
  const { data } = await apiClient.delete<InvoiceItem>(`/invoice-items/${encodeURIComponent(id)}`);
  return data;
}
