/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument -- mocks typés `any` */
import { Types } from 'mongoose';
import { AccountingAutoPostingListener } from './accounting-auto-posting.listener';
import { DomainEvents } from '../../platform/events/domain-events';
import { JournalEntryState } from '../schemas/journal-entry.entity';

const q = (value: unknown) => {
  const chain: any = {
    lean: jest.fn(() => chain),
    select: jest.fn(() => chain),
    exec: jest.fn().mockResolvedValue(value),
  };
  return chain;
};

describe('AccountingAutoPostingListener', () => {
  const propertyId = String(new Types.ObjectId());
  const orgId = String(new Types.ObjectId());
  let entries: any;
  let apps: any;
  let tenantScope: any;
  let settingsModel: any;
  let accountModel: any;
  let listener: AccountingAutoPostingListener;
  let settings: any;

  const event = (
    name: string,
    payload: Record<string, unknown>,
    model: string,
  ): any => ({
    id: 'evt',
    name,
    occurred_at: new Date(),
    property_id: propertyId,
    record: { model, id: String(payload._id) },
    payload,
  });

  beforeEach(() => {
    settings = { property_id: propertyId, auto_posting: true, currency: 'XOF' };
    entries = {
      createAndPost: jest.fn().mockResolvedValue({ entry: {}, created: true }),
      findBySource: jest.fn().mockResolvedValue(null),
      reverse: jest.fn().mockResolvedValue({}),
      cancel: jest.fn().mockResolvedValue({}),
    };
    apps = { isInstalled: jest.fn().mockResolvedValue(true) };
    tenantScope = {
      getOrganizationIdForProperty: jest.fn().mockResolvedValue(orgId),
    };
    settingsModel = { findOne: jest.fn(() => q(settings)) };
    accountModel = {
      find: jest.fn(() => q([{ code: '601' }, { code: '605' }])),
    };
    listener = new AccountingAutoPostingListener(
      entries,
      apps,
      tenantScope,
      settingsModel,
      accountModel,
    );
  });

  const invoicePayload = {
    _id: 'inv1',
    property_id: propertyId,
    invoice_number: 'INV-1',
    guest_id: 'g1',
    issue_date: '2026-05-10T00:00:00Z',
    subtotal: 100000,
    discount_amount: 0,
    tax_amount: 18000,
    total_amount: 118000,
    currency: 'XOF',
  };

  describe('facture créée', () => {
    it('passe l’écriture de vente au journal VTE avec la source facture', async () => {
      await listener.onInvoiceCreated(
        event(DomainEvents.INVOICE_CREATED, invoicePayload, 'Invoice'),
      );
      expect(apps.isInstalled).toHaveBeenCalledWith(orgId, 'accounting');
      const input = entries.createAndPost.mock.calls[0][0];
      expect(input.journal_code).toBe('VTE');
      expect(input.source).toEqual({
        model: 'Invoice',
        id: 'inv1',
        event: DomainEvents.INVOICE_CREATED,
      });
      expect(
        input.lines.map((l: any) => [l.account_code, l.debit, l.credit]),
      ).toEqual([
        ['411', 118000, 0],
        ['706', 0, 100000],
        ['4431', 0, 18000],
      ]);
    });

    it('ne fait rien si l’application n’est pas installée', async () => {
      apps.isInstalled.mockResolvedValue(false);
      await listener.onInvoiceCreated(
        event(DomainEvents.INVOICE_CREATED, invoicePayload, 'Invoice'),
      );
      expect(entries.createAndPost).not.toHaveBeenCalled();
    });

    it('ne fait rien sans paramètres ou si auto_posting est désactivé', async () => {
      settings = null;
      await listener.onInvoiceCreated(
        event(DomainEvents.INVOICE_CREATED, invoicePayload, 'Invoice'),
      );
      settings = { auto_posting: false };
      await listener.onInvoiceCreated(
        event(DomainEvents.INVOICE_CREATED, invoicePayload, 'Invoice'),
      );
      expect(entries.createAndPost).not.toHaveBeenCalled();
    });

    it('utilise les comptes paramétrés', async () => {
      settings = {
        ...settings,
        accounts: { revenue_accommodation: '7061' },
        journals: { sale: 'VT' },
      };
      await listener.onInvoiceCreated(
        event(DomainEvents.INVOICE_CREATED, invoicePayload, 'Invoice'),
      );
      const input = entries.createAndPost.mock.calls[0][0];
      expect(input.journal_code).toBe('VT');
      expect(input.lines[1].account_code).toBe('7061');
    });

    it('journalise les erreurs sans les propager', async () => {
      entries.createAndPost.mockRejectedValue(
        new Error('Comptes introuvables : 706'),
      );
      await expect(
        listener.onInvoiceCreated(
          event(DomainEvents.INVOICE_CREATED, invoicePayload, 'Invoice'),
        ),
      ).resolves.toBeUndefined();
    });
  });

  describe('facture annulée', () => {
    it('contre-passe l’écriture validée de la facture', async () => {
      const origin = {
        _id: new Types.ObjectId(),
        state: JournalEntryState.POSTED,
      };
      entries.findBySource.mockImplementation(
        (_m: string, _id: string, ev: string) =>
          Promise.resolve(ev === DomainEvents.INVOICE_CREATED ? origin : null),
      );
      await listener.onInvoiceCancelled(
        event(DomainEvents.INVOICE_CANCELLED, invoicePayload, 'Invoice'),
      );
      expect(entries.reverse).toHaveBeenCalledWith(
        String(origin._id),
        expect.objectContaining({
          source: {
            model: 'Invoice',
            id: 'inv1',
            event: DomainEvents.INVOICE_CANCELLED,
          },
        }),
      );
    });

    it('idempotent : ne contre-passe pas deux fois', async () => {
      entries.findBySource.mockResolvedValue({
        _id: new Types.ObjectId(),
        state: 'posted',
      });
      await listener.onInvoiceCancelled(
        event(DomainEvents.INVOICE_CANCELLED, invoicePayload, 'Invoice'),
      );
      expect(entries.reverse).not.toHaveBeenCalled();
    });

    it('ne fait rien si la facture n’a pas été comptabilisée', async () => {
      await listener.onInvoiceCancelled(
        event(DomainEvents.INVOICE_CANCELLED, invoicePayload, 'Invoice'),
      );
      expect(entries.reverse).not.toHaveBeenCalled();
    });
  });

  describe('paiements', () => {
    const payment = {
      _id: 'pay1',
      property_id: propertyId,
      payment_number: 'PAY-1',
      guest_id: 'g1',
      method: 'cash',
      amount: { amount: 50000, currency: 'XOF' },
      paid_at: '2026-05-11T09:00:00Z',
      metadata: {},
    };

    it('espèces : Dr 571 / Cr 411 au journal CAI', async () => {
      await listener.onPaymentCompleted(
        event(DomainEvents.PAYMENT_COMPLETED, payment, 'Payment'),
      );
      const input = entries.createAndPost.mock.calls[0][0];
      expect(input.journal_code).toBe('CAI');
      expect(
        input.lines.map((l: any) => [l.account_code, l.debit, l.credit]),
      ).toEqual([
        ['571', 50000, 0],
        ['411', 0, 50000],
      ]);
      expect(input.source.event).toBe(DomainEvents.PAYMENT_COMPLETED);
    });

    it('carte : journal BNQ / 521 ; Mobile Money : journal MOB / 552', async () => {
      await listener.onPaymentCompleted(
        event(
          DomainEvents.PAYMENT_COMPLETED,
          { ...payment, method: 'card' },
          'Payment',
        ),
      );
      await listener.onPaymentCompleted(
        event(
          DomainEvents.PAYMENT_COMPLETED,
          { ...payment, method: 'mobile_money' },
          'Payment',
        ),
      );
      const [card, momo] = entries.createAndPost.mock.calls.map(
        (c: any) => c[0],
      );
      expect(card.journal_code).toBe('BNQ');
      expect(card.lines[0].account_code).toBe('521');
      expect(momo.journal_code).toBe('MOB');
      expect(momo.lines[0].account_code).toBe('552');
    });

    it('remboursement : miroir pour le montant remboursé', async () => {
      await listener.onPaymentRefunded(
        event(
          DomainEvents.PAYMENT_REFUNDED,
          { ...payment, metadata: { refund_amount: 20000 } },
          'Payment',
        ),
      );
      const input = entries.createAndPost.mock.calls[0][0];
      expect(
        input.lines.map((l: any) => [l.account_code, l.debit, l.credit]),
      ).toEqual([
        ['571', 0, 20000],
        ['411', 20000, 0],
      ]);
      expect(input.source.event).toBe(DomainEvents.PAYMENT_REFUNDED);
    });
  });

  describe('POS et facture fournisseur', () => {
    it('ignore les charges chambre', async () => {
      await listener.onPosTransactionCompleted(
        event(
          DomainEvents.POS_TRANSACTION_COMPLETED,
          { _id: 'tx', settlement_type: 'room_charge', total: 100 },
          'PosTransaction',
        ),
      );
      expect(entries.createAndPost).not.toHaveBeenCalled();
    });

    it('facture fournisseur au journal ACH', async () => {
      await listener.onVendorBillPosted(
        event(
          DomainEvents.VENDOR_BILL_POSTED,
          {
            _id: 'b1',
            property_id: propertyId,
            number: 'FF-1',
            vendor_id: 'v1',
            date: '2026-05-12',
            amount_untaxed: 1000,
            tax_amount: 180,
            amount_total: 1180,
            lines: [
              { account_code: '605', amount_untaxed: 1000, tax_amount: 180 },
            ],
          },
          'VendorBill',
        ),
      );
      const input = entries.createAndPost.mock.calls[0][0];
      expect(input.journal_code).toBe('ACH');
      expect(input.lines.map((l: any) => l.account_code)).toEqual([
        '605',
        '4452',
        '401',
      ]);
    });
  });
});
