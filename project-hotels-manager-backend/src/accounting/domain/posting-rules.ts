import { refId } from '../../platform/events/domain-event.publisher';
import { PartnerType } from './accounting.enums';
import { round2 } from './accounting.logic';
import {
  AccountRole,
  JournalRole,
  treasuryRoleForMethod,
} from './syscohada-chart';

/**
 * Règles de comptabilisation automatique (fonctions pures) : traduisent un
 * document métier (facture, paiement, vente POS, facture fournisseur) en
 * lignes d'écriture exprimées en codes de comptes.
 */

export interface PlannedLine {
  account_code: string;
  label: string;
  debit: number;
  credit: number;
  partner_type?: PartnerType;
  partner_id?: string;
}

export interface PostingPlan {
  journal_role: JournalRole;
  date: Date;
  reference?: string;
  narration?: string;
  currency?: string;
  lines: PlannedLine[];
  /** Anomalies non bloquantes (journalisées par l'appelant). */
  warnings: string[];
}

export type AccountMapping = Record<AccountRole, string>;

const asId = (value: unknown): string | undefined =>
  value === '' ? undefined : refId(value);

const asDate = (...values: unknown[]): Date => {
  for (const value of values) {
    if (!value) continue;
    const date = new Date(value as string);
    if (!isNaN(date.getTime())) return date;
  }
  return new Date();
};

const num = (value: unknown): number => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
};

function debitLine(
  code: string,
  label: string,
  amount: number,
  partner?: { type: PartnerType; id?: string },
): PlannedLine {
  return {
    account_code: code,
    label,
    debit: round2(amount),
    credit: 0,
    ...(partner?.id
      ? { partner_type: partner.type, partner_id: partner.id }
      : {}),
  };
}

function creditLine(
  code: string,
  label: string,
  amount: number,
  partner?: { type: PartnerType; id?: string },
): PlannedLine {
  return {
    account_code: code,
    label,
    debit: 0,
    credit: round2(amount),
    ...(partner?.id
      ? { partner_type: partner.type, partner_id: partner.id }
      : {}),
  };
}

/** Inverse débit et crédit de chaque ligne (avoirs, remboursements). */
function swap(lines: PlannedLine[]): PlannedLine[] {
  return lines.map((l) => ({ ...l, debit: l.credit, credit: l.debit }));
}

// ---------------------------------------------------------------------------
// Facture client
// ---------------------------------------------------------------------------

export interface InvoicePayload {
  _id?: unknown;
  invoice_number?: string;
  guest_id?: unknown;
  status?: string;
  issue_date?: unknown;
  created_at?: unknown;
  subtotal?: number;
  tax_amount?: number;
  discount_amount?: number;
  total_amount?: number;
  currency?: string;
}

/**
 * Facture : Dr 411 Clients (TTC) / Cr 706 Services vendus (HT net de remise)
 * / Cr 4431 TVA facturée. Un avoir (`credit_note`) est comptabilisé en sens
 * inverse. Retourne `null` si la facture est à zéro.
 */
export function buildInvoicePlan(
  invoice: InvoicePayload,
  mapping: AccountMapping,
): PostingPlan | null {
  const total = round2(num(invoice.total_amount));
  const tax = round2(num(invoice.tax_amount));
  if (total <= 0) return null;
  const revenue = round2(total - tax);
  if (revenue < 0) {
    throw new Error(
      `Facture ${invoice.invoice_number ?? ''} : la taxe dépasse le total`,
    );
  }
  const warnings: string[] = [];
  const expectedRevenue = round2(
    num(invoice.subtotal) - num(invoice.discount_amount),
  );
  if (expectedRevenue !== revenue) {
    warnings.push(
      `Facture ${invoice.invoice_number ?? ''} : sous-total − remise (${expectedRevenue}) ≠ total − taxe (${revenue}) ; le total TTC fait foi`,
    );
  }
  const ref = invoice.invoice_number ?? '';
  const partner = { type: PartnerType.GUEST, id: asId(invoice.guest_id) };
  let lines: PlannedLine[] = [
    debitLine(mapping.receivable, `Facture ${ref}`, total, partner),
  ];
  if (revenue > 0) {
    lines.push(
      creditLine(mapping.revenue_accommodation, `Prestations ${ref}`, revenue),
    );
  }
  if (tax > 0) {
    lines.push(creditLine(mapping.tax_collected, `TVA ${ref}`, tax));
  }
  const isCreditNote = invoice.status === 'credit_note';
  if (isCreditNote) lines = swap(lines);
  return {
    journal_role: 'sale',
    date: asDate(invoice.issue_date, invoice.created_at),
    reference: ref,
    narration: isCreditNote ? `Avoir client ${ref}` : `Facture client ${ref}`,
    currency: invoice.currency,
    lines,
    warnings,
  };
}

// ---------------------------------------------------------------------------
// Paiement client et remboursement
// ---------------------------------------------------------------------------

export interface PaymentPayload {
  _id?: unknown;
  payment_number?: string;
  guest_id?: unknown;
  method?: string;
  amount?: { amount?: number; currency?: string } | number;
  paid_at?: unknown;
  created_at?: unknown;
  updated_at?: unknown;
  reference?: string;
  metadata?: { refund_amount?: number; refund_reason?: string } & Record<
    string,
    unknown
  >;
}

function paymentAmount(payment: PaymentPayload): {
  amount: number;
  currency?: string;
} {
  if (typeof payment.amount === 'number') {
    return { amount: round2(payment.amount) };
  }
  return {
    amount: round2(num(payment.amount?.amount)),
    currency: payment.amount?.currency,
  };
}

/** Encaissement : Dr trésorerie (selon le mode) / Cr 411 Clients. */
export function buildPaymentPlan(
  payment: PaymentPayload,
  mapping: AccountMapping,
): PostingPlan | null {
  const { amount, currency } = paymentAmount(payment);
  if (amount <= 0) return null;
  const treasury = treasuryRoleForMethod(payment.method);
  const ref = payment.payment_number ?? '';
  const partner = { type: PartnerType.GUEST, id: asId(payment.guest_id) };
  return {
    journal_role: treasury,
    date: asDate(payment.paid_at, payment.created_at),
    reference: ref,
    narration: `Encaissement ${ref}`,
    currency,
    lines: [
      debitLine(mapping[treasury], `Encaissement ${ref}`, amount),
      creditLine(
        mapping.receivable,
        `Règlement client ${ref}`,
        amount,
        partner,
      ),
    ],
    warnings: [],
  };
}

/**
 * Remboursement : miroir de l'encaissement pour `metadata.refund_amount`
 * (à défaut, le montant total du paiement).
 */
export function buildRefundPlan(
  payment: PaymentPayload,
  mapping: AccountMapping,
): PostingPlan | null {
  const { amount: paid, currency } = paymentAmount(payment);
  const requested = num(payment.metadata?.refund_amount);
  const amount = round2(requested > 0 ? requested : paid);
  if (amount <= 0) return null;
  const warnings: string[] = [];
  if (paid > 0 && amount > paid) {
    warnings.push(
      `Paiement ${payment.payment_number ?? ''} : remboursement (${amount}) supérieur au montant payé (${paid})`,
    );
  }
  const treasury = treasuryRoleForMethod(payment.method);
  const ref = payment.payment_number ?? '';
  const partner = { type: PartnerType.GUEST, id: asId(payment.guest_id) };
  return {
    journal_role: treasury,
    date: asDate(payment.updated_at, payment.paid_at, payment.created_at),
    reference: ref,
    narration: `Remboursement ${ref}`,
    currency,
    lines: swap([
      debitLine(mapping[treasury], `Remboursement ${ref}`, amount),
      creditLine(
        mapping.receivable,
        `Remboursement client ${ref}`,
        amount,
        partner,
      ),
    ]),
    warnings,
  };
}

// ---------------------------------------------------------------------------
// Vente au point de vente (règlement direct)
// ---------------------------------------------------------------------------

export interface PosTransactionPayload {
  _id?: unknown;
  transaction_number?: string;
  settlement_type?: string;
  payment_method?: string;
  guest_id?: unknown;
  total?: number;
  tax_total?: number;
  currency?: string;
  transaction_date?: unknown;
  created_at?: unknown;
}

/**
 * Vente POS réglée directement : Dr trésorerie (TTC) / Cr 701 Ventes de
 * marchandises (HT net de remises) / Cr 4431 TVA. Les charges chambre
 * (`room_charge`) sont ignorées : elles sont comptabilisées via la facture
 * hôtel.
 */
export function buildPosPlan(
  tx: PosTransactionPayload,
  mapping: AccountMapping,
): PostingPlan | null {
  if (tx.settlement_type === 'room_charge') return null;
  const total = round2(num(tx.total));
  const tax = round2(num(tx.tax_total));
  if (total <= 0) return null;
  const revenue = round2(total - tax);
  if (revenue < 0) {
    throw new Error(
      `Vente ${tx.transaction_number ?? ''} : la taxe dépasse le total`,
    );
  }
  const treasury = treasuryRoleForMethod(tx.payment_method);
  const ref = tx.transaction_number ?? '';
  const lines: PlannedLine[] = [
    debitLine(mapping[treasury], `Vente ${ref}`, total),
  ];
  if (revenue > 0) {
    lines.push(creditLine(mapping.revenue_fnb, `Ventes ${ref}`, revenue));
  }
  if (tax > 0) {
    lines.push(creditLine(mapping.tax_collected, `TVA ${ref}`, tax));
  }
  return {
    journal_role: treasury,
    date: asDate(tx.transaction_date, tx.created_at),
    reference: ref,
    narration: `Vente point de vente ${ref}`,
    currency: tx.currency,
    lines,
    warnings: [],
  };
}

// ---------------------------------------------------------------------------
// Facture fournisseur
// ---------------------------------------------------------------------------

/** Contrat de l'événement `purchase.bill.posted`. */
export interface VendorBillPayload {
  _id?: unknown;
  property_id?: unknown;
  number?: string;
  vendor_id?: unknown;
  vendor_name?: string;
  date?: string;
  currency?: string;
  amount_untaxed?: number;
  tax_amount?: number;
  amount_total?: number;
  lines?: Array<{
    description?: string;
    account_code?: string;
    amount_untaxed?: number;
    tax_amount?: number;
  }>;
}

/**
 * Facture fournisseur : Dr compte de charge de chaque ligne (`account_code`
 * ou compte d'achats par défaut, regroupés par compte) / Dr 4452 TVA
 * récupérable / Cr 401 Fournisseurs (tiers fournisseur).
 *
 * `knownCodes` : codes existants dans le plan ; un code inconnu est remplacé
 * par le compte d'achats par défaut (avec avertissement).
 */
export function buildVendorBillPlan(
  bill: VendorBillPayload,
  mapping: AccountMapping,
  knownCodes: Set<string>,
): PostingPlan | null {
  const total = round2(num(bill.amount_total));
  if (total <= 0) return null;
  const warnings: string[] = [];
  const ref = bill.number ?? '';
  const byAccount = new Map<string, { amount: number; labels: string[] }>();
  for (const line of bill.lines ?? []) {
    const amount = round2(num(line.amount_untaxed));
    if (amount === 0) continue;
    let code = (line.account_code ?? '').trim() || mapping.purchases;
    if (!knownCodes.has(code)) {
      warnings.push(
        `Facture fournisseur ${ref} : compte ${code} inconnu, imputé sur ${mapping.purchases}`,
      );
      code = mapping.purchases;
    }
    const entry = byAccount.get(code) ?? { amount: 0, labels: [] };
    entry.amount = round2(entry.amount + amount);
    if (line.description) entry.labels.push(line.description);
    byAccount.set(code, entry);
  }
  // Sans ligne exploitable : tout le HT sur le compte d'achats par défaut.
  if (byAccount.size === 0 && num(bill.amount_untaxed) > 0) {
    byAccount.set(mapping.purchases, {
      amount: round2(num(bill.amount_untaxed)),
      labels: [],
    });
  }

  const vendor = bill.vendor_name ? ` – ${bill.vendor_name}` : '';
  const lines: PlannedLine[] = [];
  for (const [code, { amount, labels }] of byAccount) {
    const label = (labels.join(', ') || `Achats ${ref}`).slice(0, 250);
    lines.push(
      amount >= 0
        ? debitLine(code, label, amount)
        : creditLine(code, label, -amount),
    );
  }
  const tax = round2(num(bill.tax_amount));
  if (tax > 0) {
    lines.push(debitLine(mapping.tax_deductible, `TVA ${ref}`, tax));
  }
  lines.push(
    creditLine(mapping.payable, `Facture fournisseur ${ref}${vendor}`, total, {
      type: PartnerType.VENDOR,
      id: asId(bill.vendor_id),
    }),
  );
  return {
    journal_role: 'purchase',
    date: asDate(bill.date),
    reference: ref,
    narration: `Facture fournisseur ${ref}${vendor}`,
    currency: bill.currency,
    lines,
    warnings,
  };
}
