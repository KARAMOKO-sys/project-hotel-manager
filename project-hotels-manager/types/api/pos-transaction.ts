// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/pos-transaction/
// =============================================================================

import type { AuditableEntity, PaymentMethod } from "./base-entities";
import type { PaginationQueryDto } from "./common";
import type { PosCategory } from "./pos-item";

/** Ligne de vente : le prix et la taxe sont repris du catalogue. */
export interface CreatePosTransactionLineDto {
  item_id: string;
  quantity: number;
  /** Remise sur la ligne (montant). */
  discount?: number;
}

export interface CreatePosTransactionDto {
  property_id: string;
  outlet?: PosCategory;
  items: CreatePosTransactionLineDto[];
  settlement_type: PosSettlementType;
  /** Obligatoire pour un paiement direct. */
  payment_method?: PaymentMethod;
  /** Obligatoire pour une imputation sur chambre. */
  reservation_id?: string;
  guest_id?: string;
  room_id?: string;
  cashier_id?: string;
  transaction_date?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export interface VoidPosTransactionDto {
  reason: string;
}

export interface RefundPosTransactionDto {
  /** Montant à rembourser ; par défaut le solde restant. */
  amount?: number;
  reason?: string;
  /** Remet les articles en stock (remboursement total uniquement). */
  restock?: boolean;
}

export interface SettlePosTransactionDto {
  invoice_id: string;
}

export interface PosTransactionQueryDto extends PaginationQueryDto {
  property_id?: string;
  status?: PosTransactionStatus;
  settlement_type?: PosSettlementType;
  outlet?: PosCategory;
  from?: string;
  to?: string;
}

export interface TopSellingQueryDto {
  from?: string;
  to?: string;
  limit?: number;
}

/** Seules les informations descriptives sont modifiables : les lignes et montants d'une transaction sont figés (utiliser annulation / remboursement). */
export type UpdatePosTransactionDto = Partial<Pick<CreatePosTransactionDto, "notes" | "metadata">>;

/** Cycle de vie d'une transaction POS. */
export enum PosTransactionStatus {
  COMPLETED = "completed",
  VOIDED = "voided",
  PARTIALLY_REFUNDED = "partially_refunded",
  REFUNDED = "refunded",
}

/** Mode de règlement : imputation sur la chambre/réservation ou paiement direct. */
export enum PosSettlementType {
  ROOM_CHARGE = "room_charge",
  DIRECT = "direct",
}

/** Ligne d'article d'une transaction (copie figée des données catalogue). */
export interface PosTransactionLine {
  item_id: string;
  name: string;
  category: PosCategory;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  /** Remise appliquée sur la ligne (montant). */
  discount: number;
  /** Montant de taxe de la ligne. */
  tax_amount: number;
  /** Total TTC de la ligne. */
  total: number;
}

/** Transaction de point de vente (bar, spa, activités, blanchisserie…). Elle est soit imputée à une réservation (note de chambre), soit réglée directement. */
export interface PosTransaction extends AuditableEntity {
  transaction_number: string;
  property_id: string;
  /** Point de vente (outlet) à l'origine de la vente. */
  outlet?: PosCategory;
  items: PosTransactionLine[];
  currency: string;
  subtotal: number;
  discount_total: number;
  tax_total: number;
  total: number;
  settlement_type: PosSettlementType;
  payment_method?: PaymentMethod;
  reservation_id?: string;
  guest_id?: string;
  room_id?: string;
  /** Facture sur laquelle la charge chambre a été reportée. */
  invoice_id?: string;
  /** Vrai lorsqu'une charge chambre a été reportée sur une facture. */
  is_settled: boolean;
  cashier_id?: string;
  status: PosTransactionStatus;
  transaction_date: string;
  voided_at?: string;
  void_reason?: string;
  refunded_amount: number;
  refunded_at?: string;
  refund_reason?: string;
  notes?: string;
  metadata: Record<string, unknown>;
}

/** Rapport des ventes journalières d'un établissement. */
export interface PosDailySales {
  property_id: string;
  date: string;
  currency: string;
  transaction_count: number;
  voided_count: number;
  gross_sales: number;
  discount_total: number;
  tax_total: number;
  refunds: number;
  net_sales: number;
  by_outlet: Record<string, { quantity: number; revenue: number }>;
  by_settlement: Record<string, number>;
  by_payment_method: Record<string, number>;
}

/** Charges chambre non encore reportées sur facture. */
export interface PosRoomCharges {
  reservation_id: string;
  count: number;
  total: number;
  transactions: PosTransaction[];
}

/** Ligne du classement des articles les plus vendus. */
export interface PosTopSellingItem {
  item_id: string;
  name: string;
  category: string;
  quantity: number;
  revenue: number;
}
