// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/invoice-item/
// =============================================================================

import type { AuditableEntity } from "./base-entities";

export interface CreateInvoiceItemDto {
  invoice_id: string;
  description: string;
  quantity?: number;
  unit_price: number;
  total?: number;
  tax_rate?: number;
  sort_order?: number;
}

export type UpdateInvoiceItemDto = Partial<CreateInvoiceItemDto>;

/** Ligne de facture rattachée à une facture. */
export interface InvoiceItem extends AuditableEntity {
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  tax_rate: number;
  sort_order: number;
}
