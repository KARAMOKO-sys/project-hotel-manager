// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/invoice/
// =============================================================================

import type { AuditableEntity, Currency, InvoiceStatus } from "./base-entities";

export interface CreateInvoiceDto {
  reservation_id?: string;
  guest_id?: string;
  property_id?: string;
  status?: InvoiceStatus;
  issue_date?: string;
  due_date?: string;
  subtotal?: number;
  tax_amount?: number;
  discount_amount?: number;
  total_amount?: number;
  currency?: Currency;
  notes?: string;
}

export type UpdateInvoiceDto = Partial<CreateInvoiceDto>;

export interface Invoice extends AuditableEntity {
  invoice_number: string;
  reservation_id?: string;
  guest_id?: string;
  property_id?: string;
  status: InvoiceStatus;
  issue_date: string;
  due_date?: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  currency: string;
  notes?: string;
}
