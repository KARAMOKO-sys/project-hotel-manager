// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/payment/
// =============================================================================

import type { AuditableEntity, MoneyEmbeddable, PaymentMethod, PaymentStatus } from "./base-entities";
import type { MoneyDto } from "./common";

export interface CreatePaymentDto {
  invoice_id?: string;
  reservation_id?: string;
  guest_id?: string;
  property_id?: string;
  amount: MoneyDto;
  method?: PaymentMethod;
  status?: PaymentStatus;
  transaction_id?: string;
  reference?: string;
  received_amount?: number;
  paid_at?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export type UpdatePaymentDto = Partial<CreatePaymentDto>;

export interface Payment extends AuditableEntity {
  payment_number: string;
  invoice_id?: string;
  reservation_id?: string;
  guest_id?: string;
  property_id?: string;
  amount: MoneyEmbeddable;
  method: PaymentMethod;
  status: PaymentStatus;
  transaction_id?: string;
  reference?: string;
  received_amount?: number;
  change_due: number;
  paid_at?: string;
  notes?: string;
  metadata: Record<string, unknown>;
}
