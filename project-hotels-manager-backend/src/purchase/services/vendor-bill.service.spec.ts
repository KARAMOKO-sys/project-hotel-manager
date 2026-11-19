/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */
import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import {
  buildVendorBillPostedPayload,
  VendorBillService,
} from './vendor-bill.service';
import { PurchaseOrderState, VendorBillState } from '../purchase.utils';
import { DomainEvents } from '../../platform/events/domain-events';

const q = (value: unknown) => {
  const query: any = {
    lean: jest.fn(() => query),
    exec: jest.fn().mockResolvedValue(value),
  };
  return query;
};

describe('VendorBillService', () => {
  const propertyId = new Types.ObjectId();
  const vendorId = new Types.ObjectId();
  let order: any;
  let bill: any;
  let billModel: any;
  let orderModel: any;
  let orders: any;
  let events: any;
  let service: VendorBillService;

  beforeEach(() => {
    order = {
      _id: new Types.ObjectId(),
      property_id: propertyId,
      vendor_id: vendorId,
      state: PurchaseOrderState.PARTIALLY_RECEIVED,
      currency: 'XOF',
      lines: [
        {
          description: 'Draps 2 places',
          quantity: 10,
          unit_price: 8000,
          tax_rate: 18,
          received_qty: 6,
          billed_qty: 2,
          account_code: '6052',
        },
        {
          description: 'Taies',
          quantity: 10,
          unit_price: 1000,
          tax_rate: 0,
          received_qty: 0,
          billed_qty: 0,
        },
      ],
    };
    const BillModel: any = function (data: any) {
      const doc = { _id: new Types.ObjectId(), ...data };
      doc.save = jest.fn().mockResolvedValue(doc);
      return doc;
    };
    BillModel.findById = jest.fn(() => q(bill));
    BillModel.findOneAndUpdate = jest.fn((_f: any, update: any) =>
      q({ ...bill, ...update.$set }),
    );
    billModel = BillModel;
    orderModel = {
      findOneAndUpdate: jest.fn(() => q(order)),
      updateOne: jest.fn(() => q({})),
    };
    orders = {
      findOne: jest.fn().mockResolvedValue(order),
      refreshBillingStatus: jest.fn().mockResolvedValue(undefined),
    };
    events = { publish: jest.fn().mockResolvedValue(undefined) };
    service = new VendorBillService(
      billModel,
      orderModel,
      {
        getForProperty: jest
          .fn()
          .mockResolvedValue({ payment_term_days: 30, currency: 'XOF' }),
        namesById: jest
          .fn()
          .mockResolvedValue(new Map([[String(vendorId), 'Textiles Abidjan']])),
      } as any,
      orders,
      { findProduct: jest.fn() } as any,
      { next: jest.fn().mockResolvedValue('FF/2026/00001') } as any,
      events,
    );
  });

  it('facture les quantités reçues non facturées (réservation atomique)', async () => {
    const result: any = await service.createFromOrder(
      String(order._id),
      { bill_date: '2026-03-01T00:00:00.000Z', vendor_reference: 'TA-77' },
      'u1',
    );
    expect(orderModel.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ 'lines.0.billed_qty': 2 }),
      { $inc: { 'lines.0.billed_qty': 4 } },
      { new: true },
    );
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0]).toEqual(
      expect.objectContaining({
        quantity: 4,
        purchase_line_index: 0,
        amount_untaxed: 32000,
        tax_amount: 5760,
      }),
    );
    expect(result.amount_total).toBe(37760);
    expect(result.number).toBe('FF/2026/00001');
    expect(result.due_date.toISOString()).toBe('2026-03-31T00:00:00.000Z');
    expect(orders.refreshBillingStatus).toHaveBeenCalled();
  });

  it('refuse une facture sans quantité facturable', async () => {
    order.lines[0].billed_qty = 6;
    await expect(
      service.createFromOrder(String(order._id), {}),
    ).rejects.toThrow(BadRequestException);
  });

  it('comptabilise et publie VENDOR_BILL_POSTED au format convenu', async () => {
    bill = {
      _id: new Types.ObjectId(),
      property_id: propertyId,
      vendor_id: vendorId,
      number: 'FF/2026/00001',
      bill_date: new Date('2026-03-01T00:00:00.000Z'),
      currency: 'XOF',
      state: VendorBillState.DRAFT,
      amount_untaxed: 33000,
      tax_amount: 5760,
      amount_total: 38760,
      lines: [
        {
          description: 'Draps 2 places',
          quantity: 4,
          unit_price: 8000,
          account_code: '6052',
          amount_untaxed: 32000,
          tax_amount: 5760,
        },
        {
          description: 'Transport',
          quantity: 1,
          unit_price: 1000,
          amount_untaxed: 1000,
          tax_amount: 0,
        },
      ],
    };
    await service.post(String(bill._id), 'u1');
    const [name, input] = events.publish.mock.calls[0];
    expect(name).toBe(DomainEvents.VENDOR_BILL_POSTED);
    expect(input.payload).toEqual({
      _id: String(bill._id),
      property_id: String(propertyId),
      number: 'FF/2026/00001',
      vendor_id: String(vendorId),
      vendor_name: 'Textiles Abidjan',
      date: '2026-03-01T00:00:00.000Z',
      currency: 'XOF',
      amount_untaxed: 33000,
      tax_amount: 5760,
      amount_total: 38760,
      lines: [
        {
          description: 'Draps 2 places',
          account_code: '6052',
          amount_untaxed: 32000,
          tax_amount: 5760,
        },
        { description: 'Transport', amount_untaxed: 1000, tax_amount: 0 },
      ],
    });
  });

  it('libère les quantités facturées à l’annulation d’un brouillon', async () => {
    bill = {
      _id: new Types.ObjectId(),
      state: VendorBillState.DRAFT,
      purchase_order_id: order._id,
      lines: [{ quantity: 4, purchase_line_index: 0 }],
    };
    await service.cancel(String(bill._id));
    expect(orderModel.updateOne).toHaveBeenCalledWith(
      { _id: order._id },
      { $inc: { 'lines.0.billed_qty': -4 } },
    );
  });

  it('buildVendorBillPostedPayload omet account_code absent', () => {
    const payload = buildVendorBillPostedPayload(
      {
        _id: 'b',
        property_id: 'p',
        vendor_id: 'v',
        number: 'FF/1',
        bill_date: new Date('2026-01-01'),
        currency: 'XOF',
        amount_untaxed: 1,
        tax_amount: 0,
        amount_total: 1,
        lines: [{ description: 'x', amount_untaxed: 1, tax_amount: 0 }],
      } as any,
      'V',
    );
    expect(Object.keys(payload.lines[0])).toEqual([
      'description',
      'amount_untaxed',
      'tax_amount',
    ]);
  });
});
