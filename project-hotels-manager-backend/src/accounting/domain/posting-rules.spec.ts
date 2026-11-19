import {
  buildInvoicePlan,
  buildPaymentPlan,
  buildPosPlan,
  buildRefundPlan,
  buildVendorBillPlan,
} from './posting-rules';
import { checkBalance } from './accounting.logic';
import {
  DEFAULT_ACCOUNT_MAPPING,
  treasuryRoleForMethod,
} from './syscohada-chart';
import { PartnerType } from './accounting.enums';

const mapping = { ...DEFAULT_ACCOUNT_MAPPING };

describe('posting-rules', () => {
  describe('facture', () => {
    const invoice = {
      _id: 'inv1',
      invoice_number: 'INV-1',
      guest_id: 'g1',
      issue_date: '2026-05-10T10:00:00Z',
      subtotal: 110000,
      discount_amount: 10000,
      tax_amount: 18000,
      total_amount: 118000,
      currency: 'XOF',
    };

    it('Dr 411 TTC / Cr 706 HT net / Cr 4431 TVA', () => {
      const plan = buildInvoicePlan(invoice, mapping)!;
      expect(plan.journal_role).toBe('sale');
      expect(plan.lines).toEqual([
        expect.objectContaining({
          account_code: '411',
          debit: 118000,
          credit: 0,
          partner_type: PartnerType.GUEST,
          partner_id: 'g1',
        }),
        expect.objectContaining({
          account_code: '706',
          debit: 0,
          credit: 100000,
        }),
        expect.objectContaining({
          account_code: '4431',
          debit: 0,
          credit: 18000,
        }),
      ]);
      expect(checkBalance(plan.lines).ok).toBe(true);
      expect(plan.warnings).toHaveLength(0);
    });

    it('sans taxe : deux lignes ; total nul : rien', () => {
      const plan = buildInvoicePlan(
        { ...invoice, tax_amount: 0, total_amount: 100000 },
        mapping,
      )!;
      expect(plan.lines).toHaveLength(2);
      expect(
        buildInvoicePlan({ ...invoice, total_amount: 0 }, mapping),
      ).toBeNull();
    });

    it('le TTC fait foi en cas d’incohérence (avertissement)', () => {
      const plan = buildInvoicePlan(
        { ...invoice, total_amount: 120000 },
        mapping,
      )!;
      expect(checkBalance(plan.lines).ok).toBe(true);
      expect(plan.warnings).toHaveLength(1);
    });

    it('un avoir est comptabilisé en sens inverse', () => {
      const plan = buildInvoicePlan(
        { ...invoice, status: 'credit_note' },
        mapping,
      )!;
      expect(plan.lines[0]).toMatchObject({
        account_code: '411',
        debit: 0,
        credit: 118000,
      });
      expect(checkBalance(plan.lines).ok).toBe(true);
    });

    it('refuse une taxe supérieure au total', () => {
      expect(() =>
        buildInvoicePlan({ ...invoice, tax_amount: 200000 }, mapping),
      ).toThrow();
    });
  });

  describe('paiement', () => {
    it('choisit la trésorerie selon le mode', () => {
      expect(treasuryRoleForMethod('cash')).toBe('cash');
      expect(treasuryRoleForMethod('card')).toBe('bank');
      expect(treasuryRoleForMethod('bank_transfer')).toBe('bank');
      expect(treasuryRoleForMethod('online')).toBe('bank');
      expect(treasuryRoleForMethod('check')).toBe('bank');
      expect(treasuryRoleForMethod('mobile_money')).toBe('mobile_money');
    });

    it('Mobile Money : Dr 552 / Cr 411', () => {
      const plan = buildPaymentPlan(
        {
          payment_number: 'PAY-1',
          method: 'mobile_money',
          guest_id: 'g1',
          amount: { amount: 50000, currency: 'XOF' },
        },
        mapping,
      )!;
      expect(plan.journal_role).toBe('mobile_money');
      expect(plan.lines[0]).toMatchObject({
        account_code: '552',
        debit: 50000,
      });
      expect(plan.lines[1]).toMatchObject({
        account_code: '411',
        credit: 50000,
        partner_id: 'g1',
      });
    });

    it('remboursement partiel : miroir pour refund_amount', () => {
      const plan = buildRefundPlan(
        {
          payment_number: 'PAY-1',
          method: 'card',
          amount: { amount: 50000 },
          metadata: { refund_amount: 20000 },
        },
        mapping,
      )!;
      expect(plan.journal_role).toBe('bank');
      expect(plan.lines[0]).toMatchObject({
        account_code: '521',
        debit: 0,
        credit: 20000,
      });
      expect(plan.lines[1]).toMatchObject({
        account_code: '411',
        debit: 20000,
        credit: 0,
      });
    });

    it('remboursement sans montant : total du paiement', () => {
      const plan = buildRefundPlan(
        { method: 'cash', amount: { amount: 7000 } },
        mapping,
      )!;
      expect(plan.lines[0].credit).toBe(7000);
    });
  });

  describe('vente POS', () => {
    it('règlement direct : Dr trésorerie / Cr 701 / Cr 4431', () => {
      const plan = buildPosPlan(
        {
          transaction_number: 'POS-1',
          settlement_type: 'direct',
          payment_method: 'cash',
          total: 11800,
          tax_total: 1800,
        },
        mapping,
      )!;
      expect(
        plan.lines.map((l) => [l.account_code, l.debit, l.credit]),
      ).toEqual([
        ['571', 11800, 0],
        ['701', 0, 10000],
        ['4431', 0, 1800],
      ]);
    });

    it('charge chambre : ignorée', () => {
      expect(
        buildPosPlan({ settlement_type: 'room_charge', total: 100 }, mapping),
      ).toBeNull();
    });
  });

  describe('facture fournisseur', () => {
    const bill = {
      _id: 'b1',
      number: 'FF-1',
      vendor_id: 'v1',
      vendor_name: 'SODECI',
      date: '2026-05-12',
      amount_untaxed: 150000,
      tax_amount: 27000,
      amount_total: 177000,
      lines: [
        {
          description: 'Boissons',
          account_code: '601',
          amount_untaxed: 100000,
          tax_amount: 18000,
        },
        {
          description: 'Eau',
          account_code: '605',
          amount_untaxed: 30000,
          tax_amount: 5400,
        },
        { description: 'Divers', amount_untaxed: 20000, tax_amount: 3600 },
      ],
    };
    const known = new Set(['601', '605', '4452', '401']);

    it('Dr charges par compte / Dr 4452 / Cr 401 (tiers fournisseur)', () => {
      const plan = buildVendorBillPlan(bill, mapping, known)!;
      expect(plan.journal_role).toBe('purchase');
      const byCode = Object.fromEntries(
        plan.lines.map((l) => [l.account_code, l]),
      );
      expect(byCode['601'].debit).toBe(120000); // 100 000 + ligne sans compte
      expect(byCode['605'].debit).toBe(30000);
      expect(byCode['4452'].debit).toBe(27000);
      expect(byCode['401']).toMatchObject({
        credit: 177000,
        partner_type: PartnerType.VENDOR,
        partner_id: 'v1',
      });
      expect(checkBalance(plan.lines).ok).toBe(true);
    });

    it('compte inconnu : imputé sur les achats par défaut avec avertissement', () => {
      const plan = buildVendorBillPlan(
        {
          ...bill,
          lines: [{ account_code: '999999', amount_untaxed: 150000 }],
        },
        mapping,
        known,
      )!;
      expect(plan.lines[0].account_code).toBe('601');
      expect(plan.warnings[0]).toMatch(/999999/);
    });
  });
});
