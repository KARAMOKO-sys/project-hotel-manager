/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */
import { BadRequestException, ConflictException } from '@nestjs/common';
import { Types } from 'mongoose';
import { PurchaseOrderService } from './purchase-order.service';
import { PurchaseOrderState } from '../purchase.utils';
import { ProductType } from '../../inventory/inventory.enums';
import { DomainEvents } from '../../platform/events/domain-events';

const q = (value: unknown) => {
  const query: any = {
    lean: jest.fn(() => query),
    exec: jest.fn().mockResolvedValue(value),
  };
  return query;
};

describe('PurchaseOrderService', () => {
  const propertyId = new Types.ObjectId();
  const vendorId = new Types.ObjectId();
  const productId = new Types.ObjectId();
  let order: any;
  let orderModel: any;
  let vendors: any;
  let settings: any;
  let inventory: any;
  let events: any;
  let service: PurchaseOrderService;

  const line = (overrides: any = {}) => ({
    product_id: productId,
    description: 'Eau minérale 1,5 l',
    quantity: 10,
    unit_price: 300,
    tax_rate: 18,
    received_qty: 0,
    billed_qty: 0,
    amount_untaxed: 3000,
    tax_amount: 540,
    amount_total: 3540,
    ...overrides,
  });

  beforeEach(() => {
    order = {
      _id: new Types.ObjectId(),
      property_id: propertyId,
      vendor_id: vendorId,
      number: 'BC/2026/00001',
      state: PurchaseOrderState.DRAFT,
      lines: [line()],
      amount_total: 3540,
      currency: 'XOF',
    };
    orderModel = {
      findById: jest.fn(() => q(order)),
      findOne: jest.fn(() => q(null)),
      findOneAndUpdate: jest.fn((_f: any, update: any) => {
        const next = { ...order, ...(update.$set ?? {}) };
        if (update.$inc) {
          next.lines = order.lines.map((l: any, i: number) => ({
            ...l,
            received_qty:
              l.received_qty + (update.$inc[`lines.${i}.received_qty`] ?? 0),
          }));
        }
        if (update.$push) next.lines = [...order.lines, update.$push.lines];
        order = next;
        return q(next);
      }),
      findByIdAndUpdate: jest.fn((_id: any, update: any) =>
        q({ ...order, ...update.$set }),
      ),
      create: jest.fn((data: any) => Promise.resolve({ _id: 'new', ...data })),
    };
    vendors = {
      getForProperty: jest.fn().mockResolvedValue({
        _id: vendorId,
        currency: 'XOF',
        is_active: true,
      }),
    };
    settings = {
      get: jest.fn().mockResolvedValue({ approval_threshold: 500_000 }),
    };
    inventory = {
      findProduct: jest.fn().mockResolvedValue({
        _id: productId,
        property_id: propertyId,
        name: 'Eau minérale 1,5 l',
        product_type: ProductType.STOCKABLE,
      }),
      receive: jest.fn().mockResolvedValue({ _id: 'move-1' }),
    };
    events = { publish: jest.fn().mockResolvedValue(undefined) };
    service = new PurchaseOrderService(
      orderModel,
      vendors,
      settings,
      inventory,
      { next: jest.fn().mockResolvedValue('BC/2026/00002') } as any,
      events,
    );
  });

  describe('confirm', () => {
    it('confirme sous le seuil et publie PURCHASE_ORDER_CONFIRMED', async () => {
      const result = await service.confirm(String(order._id), 'u1');
      expect(result.state).toBe(PurchaseOrderState.CONFIRMED);
      expect(events.publish).toHaveBeenCalledWith(
        DomainEvents.PURCHASE_ORDER_CONFIRMED,
        expect.objectContaining({ actor_id: 'u1' }),
      );
    });

    it('au-delà du seuil, passe à approuver sans événement', async () => {
      order.amount_total = 750_000;
      const result = await service.confirm(String(order._id));
      expect(result.state).toBe(PurchaseOrderState.TO_APPROVE);
      expect(events.publish).not.toHaveBeenCalled();

      const approved = await service.approve(String(order._id), 'manager');
      expect(approved.state).toBe(PurchaseOrderState.CONFIRMED);
      expect(approved.approved_by).toBe('manager');
      expect(events.publish).toHaveBeenCalledWith(
        DomainEvents.PURCHASE_ORDER_CONFIRMED,
        expect.anything(),
      );
    });

    it('refuse d’approuver une commande qui n’attend pas d’approbation', async () => {
      await expect(service.approve(String(order._id))).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('receive', () => {
    beforeEach(() => {
      order.state = PurchaseOrderState.CONFIRMED;
    });

    it('réception partielle : entrée en stock et état partiellement reçu', async () => {
      const result = await service.receive(
        String(order._id),
        { lines: [{ line_index: 0, quantity: 4 }] },
        'u1',
      );
      expect(orderModel.findOneAndUpdate.mock.calls[0][0]).toEqual(
        expect.objectContaining({ 'lines.0.received_qty': 0 }),
      );
      expect(inventory.receive).toHaveBeenCalledWith(
        String(productId),
        4,
        300,
        String(propertyId),
        { model: 'PurchaseOrder', id: String(order._id) },
        expect.objectContaining({ actorId: 'u1' }),
      );
      expect(result.order.state).toBe(PurchaseOrderState.PARTIALLY_RECEIVED);
      expect(result.moves).toEqual(['move-1']);
      expect(events.publish).toHaveBeenCalledWith(
        DomainEvents.PURCHASE_ORDER_RECEIVED,
        expect.objectContaining({
          payload: expect.objectContaining({ fully_received: false }),
        }),
      );
    });

    it('réception du solde : état reçu', async () => {
      order.state = PurchaseOrderState.PARTIALLY_RECEIVED;
      order.lines = [line({ received_qty: 4 })];
      const result = await service.receive(String(order._id), {
        lines: [{ line_index: 0, quantity: 6 }],
      });
      expect(result.order.state).toBe(PurchaseOrderState.RECEIVED);
    });

    it('refuse une sur-réception', async () => {
      await expect(
        service.receive(String(order._id), {
          lines: [{ line_index: 0, quantity: 11 }],
        }),
      ).rejects.toThrow(BadRequestException);
      expect(inventory.receive).not.toHaveBeenCalled();
    });

    it('ne crée pas de mouvement pour un service', async () => {
      inventory.findProduct.mockResolvedValue({
        product_type: ProductType.SERVICE,
      });
      await service.receive(String(order._id), {
        lines: [{ line_index: 0, quantity: 1 }],
      });
      expect(inventory.receive).not.toHaveBeenCalled();
    });

    it('refuse de réceptionner un brouillon', async () => {
      order.state = PurchaseOrderState.DRAFT;
      await expect(
        service.receive(String(order._id), {
          lines: [{ line_index: 0, quantity: 1 }],
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  it('refuse d’annuler une commande déjà reçue', async () => {
    order.state = PurchaseOrderState.PARTIALLY_RECEIVED;
    await expect(service.cancel(String(order._id))).rejects.toThrow(
      ConflictException,
    );
  });

  describe('addReorderLine', () => {
    const payload = {
      product_id: String(new Types.ObjectId()),
      product_name: 'Gel douche 30 ml',
      property_id: String(propertyId),
      quantity_available: 4,
      reorder_min: 5,
      reorder_max: 20,
      preferred_vendor_id: String(vendorId),
    };

    it('crée le brouillon automatique s’il n’existe pas', async () => {
      const result = await service.addReorderLine(
        payload,
        String(vendorId),
        16,
        150,
      );
      expect(result.outcome).toBe('created_order');
      expect(orderModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          is_system_generated: true,
          state: PurchaseOrderState.DRAFT,
          amount_total: 2400,
          lines: [expect.objectContaining({ quantity: 16, unit_price: 150 })],
        }),
      );
    });

    it('ajoute la ligne au brouillon existant sans doublon', async () => {
      orderModel.findOne.mockReturnValue(q(order));
      const added = await service.addReorderLine(
        payload,
        String(vendorId),
        16,
        150,
      );
      expect(added.outcome).toBe('added_line');
      expect(orderModel.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          'lines.product_id': { $ne: new Types.ObjectId(payload.product_id) },
        }),
        expect.anything(),
        expect.anything(),
      );

      orderModel.findOneAndUpdate.mockReturnValueOnce(q(null));
      const again = await service.addReorderLine(
        payload,
        String(vendorId),
        16,
        150,
      );
      expect(again.outcome).toBe('already_present');
    });

    it('ne fait rien sans quantité à commander', async () => {
      const result = await service.addReorderLine(
        payload,
        String(vendorId),
        0,
        1,
      );
      expect(result.outcome).toBe('nothing_to_order');
      expect(orderModel.create).not.toHaveBeenCalled();
    });
  });
});
