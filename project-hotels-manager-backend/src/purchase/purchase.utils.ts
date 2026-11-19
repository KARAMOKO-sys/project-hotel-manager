/** États d'un bon de commande fournisseur. */
export enum PurchaseOrderState {
  DRAFT = 'draft',
  SENT = 'sent',
  TO_APPROVE = 'to_approve',
  CONFIRMED = 'confirmed',
  PARTIALLY_RECEIVED = 'partially_received',
  RECEIVED = 'received',
  CANCELLED = 'cancelled',
}

/** Avancement de la facturation fournisseur d'un bon de commande. */
export enum BillingStatus {
  NONE = 'none',
  PARTIAL = 'partial',
  BILLED = 'billed',
}

export enum VendorBillState {
  DRAFT = 'draft',
  POSTED = 'posted',
  PAID = 'paid',
  CANCELLED = 'cancelled',
}

/** États d'un bon de commande où l'on peut réceptionner. */
export const RECEIVABLE_STATES = [
  PurchaseOrderState.CONFIRMED,
  PurchaseOrderState.PARTIALLY_RECEIVED,
];

/** États « commande ouverte » (engagement en cours). */
export const OPEN_ORDER_STATES = [
  PurchaseOrderState.DRAFT,
  PurchaseOrderState.SENT,
  PurchaseOrderState.TO_APPROVE,
  PurchaseOrderState.CONFIRMED,
  PurchaseOrderState.PARTIALLY_RECEIVED,
];

/** Seuil d'approbation par défaut (XOF). */
export const DEFAULT_APPROVAL_THRESHOLD = 500_000;

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function roundQty(value: number): number {
  return Math.round((value + Number.EPSILON) * 1000) / 1000;
}

export interface PricedLine {
  quantity: number;
  unit_price: number;
  tax_rate?: number;
}

export interface LineAmounts {
  amount_untaxed: number;
  tax_amount: number;
  amount_total: number;
}

/** Montants d'une ligne : HT = qté × PU, taxe = HT × taux %. */
export function computeLineAmounts(line: PricedLine): LineAmounts {
  const untaxed = roundMoney(line.quantity * line.unit_price);
  const tax = roundMoney((untaxed * (line.tax_rate ?? 0)) / 100);
  return {
    amount_untaxed: untaxed,
    tax_amount: tax,
    amount_total: roundMoney(untaxed + tax),
  };
}

/** Totaux d'un document (somme des lignes arrondies). */
export function computeTotals(lines: PricedLine[]): {
  amount_untaxed: number;
  amount_tax: number;
  amount_total: number;
} {
  let untaxed = 0;
  let tax = 0;
  for (const line of lines) {
    const amounts = computeLineAmounts(line);
    untaxed += amounts.amount_untaxed;
    tax += amounts.tax_amount;
  }
  return {
    amount_untaxed: roundMoney(untaxed),
    amount_tax: roundMoney(tax),
    amount_total: roundMoney(untaxed + tax),
  };
}

/** Faut-il une approbation (montant strictement supérieur au seuil) ? */
export function requiresApproval(
  amountTotal: number,
  threshold: number,
): boolean {
  return threshold >= 0 && amountTotal > threshold;
}

interface QtyLine {
  quantity: number;
  received_qty?: number;
  billed_qty?: number;
}

/** État de réception déduit des quantités reçues. */
export function computeReceiptState(lines: QtyLine[]): PurchaseOrderState {
  if (lines.length === 0) return PurchaseOrderState.CONFIRMED;
  if (lines.every((l) => (l.received_qty ?? 0) >= l.quantity)) {
    return PurchaseOrderState.RECEIVED;
  }
  if (lines.some((l) => (l.received_qty ?? 0) > 0)) {
    return PurchaseOrderState.PARTIALLY_RECEIVED;
  }
  return PurchaseOrderState.CONFIRMED;
}

/** Statut de facturation : facturé quand toutes les quantités commandées le sont. */
export function computeBillingStatus(lines: QtyLine[]): BillingStatus {
  if (lines.length === 0 || lines.every((l) => (l.billed_qty ?? 0) <= 0)) {
    return BillingStatus.NONE;
  }
  if (lines.every((l) => (l.billed_qty ?? 0) >= l.quantity)) {
    return BillingStatus.BILLED;
  }
  return BillingStatus.PARTIAL;
}

/** Quantité reçue mais pas encore facturée. */
export function billableQty(line: QtyLine): number {
  return Math.max(
    0,
    roundQty((line.received_qty ?? 0) - (line.billed_qty ?? 0)),
  );
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + (days || 0));
  return result;
}
