import {
  addDays,
  billableQty,
  BillingStatus,
  computeBillingStatus,
  computeLineAmounts,
  computeReceiptState,
  computeTotals,
  PurchaseOrderState,
  requiresApproval,
} from './purchase.utils';

describe('purchase.utils', () => {
  it('calcule les montants d’une ligne (HT, taxe, TTC)', () => {
    expect(
      computeLineAmounts({ quantity: 3, unit_price: 1250, tax_rate: 18 }),
    ).toEqual({ amount_untaxed: 3750, tax_amount: 675, amount_total: 4425 });
  });

  it('calcule les totaux d’un document', () => {
    expect(
      computeTotals([
        { quantity: 2, unit_price: 1000, tax_rate: 18 },
        { quantity: 1, unit_price: 333.33 },
      ]),
    ).toEqual({
      amount_untaxed: 2333.33,
      amount_tax: 360,
      amount_total: 2693.33,
    });
  });

  it('seuil d’approbation : strictement supérieur', () => {
    expect(requiresApproval(500_000, 500_000)).toBe(false);
    expect(requiresApproval(500_001, 500_000)).toBe(true);
  });

  it('état de réception', () => {
    expect(computeReceiptState([{ quantity: 5, received_qty: 0 }])).toBe(
      PurchaseOrderState.CONFIRMED,
    );
    expect(
      computeReceiptState([
        { quantity: 5, received_qty: 5 },
        { quantity: 2, received_qty: 1 },
      ]),
    ).toBe(PurchaseOrderState.PARTIALLY_RECEIVED);
    expect(
      computeReceiptState([
        { quantity: 5, received_qty: 5 },
        { quantity: 2, received_qty: 2 },
      ]),
    ).toBe(PurchaseOrderState.RECEIVED);
  });

  it('statut de facturation et quantité facturable', () => {
    expect(computeBillingStatus([{ quantity: 5, billed_qty: 0 }])).toBe(
      BillingStatus.NONE,
    );
    expect(computeBillingStatus([{ quantity: 5, billed_qty: 2 }])).toBe(
      BillingStatus.PARTIAL,
    );
    expect(computeBillingStatus([{ quantity: 5, billed_qty: 5 }])).toBe(
      BillingStatus.BILLED,
    );
    expect(billableQty({ quantity: 5, received_qty: 4, billed_qty: 1 })).toBe(
      3,
    );
    expect(billableQty({ quantity: 5, received_qty: 1, billed_qty: 1 })).toBe(
      0,
    );
  });

  it('échéance = date + délai de paiement', () => {
    expect(addDays(new Date('2026-01-31T00:00:00Z'), 30).toISOString()).toBe(
      '2026-03-02T00:00:00.000Z',
    );
  });
});
