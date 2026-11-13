/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { PosTransactionService } from './pos-transaction.service';
import {
  PosSettlementType,
  PosTransaction,
  PosTransactionStatus,
} from '../schemas/pos-transaction.entity';
import { PosItemService } from '../../pos-item/services/pos-item.service';
import { PosCategory } from '../../pos-item/schemas/pos-item.entity';
import { PaymentMethod } from '../../base-entities/enums/payment-method.enum';

const execOf = (value: unknown) => ({
  exec: jest.fn().mockResolvedValue(value),
});
const chainOf = (value: unknown) => ({
  sort: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  lean: jest.fn().mockReturnThis(),
  exec: jest.fn().mockResolvedValue(value),
});

describe('PosTransactionService', () => {
  let service: PosTransactionService;
  let model: any;
  let posItemService: Record<string, jest.Mock>;
  let trx: any;

  const propertyId = new Types.ObjectId();
  const reservationId = new Types.ObjectId();
  const beer = {
    _id: new Types.ObjectId(),
    property_id: propertyId,
    name: 'Bière',
    category: PosCategory.BAR,
    price: { amount: 1000, currency: 'XOF' },
    tax_rate: 18,
    track_stock: true,
    stock_quantity: 10,
    is_active: true,
  };
  const massage = {
    _id: new Types.ObjectId(),
    property_id: propertyId,
    name: 'Massage',
    category: PosCategory.SPA,
    price: { amount: 20000, currency: 'XOF' },
    tax_rate: 0,
    track_stock: false,
    stock_quantity: 0,
    is_active: true,
  };

  beforeEach(async () => {
    trx = {
      _id: new Types.ObjectId(),
      property_id: propertyId,
      transaction_number: 'POS-1-ABC',
      items: [
        {
          item_id: beer._id,
          name: 'Bière',
          category: PosCategory.BAR,
          quantity: 2,
          unit_price: 1000,
          tax_rate: 18,
          discount: 0,
          tax_amount: 360,
          total: 2360,
        },
      ],
      currency: 'XOF',
      subtotal: 2000,
      discount_total: 0,
      tax_total: 360,
      total: 2360,
      settlement_type: PosSettlementType.ROOM_CHARGE,
      reservation_id: reservationId,
      status: PosTransactionStatus.COMPLETED,
      refunded_amount: 0,
      is_settled: false,
    };

    const ModelMock: any = function (data: any) {
      const doc = { ...data };
      doc.save = jest.fn().mockResolvedValue(doc);
      return doc;
    };
    ModelMock.findById = jest.fn().mockImplementation(() => execOf(trx));
    ModelMock.findOne = jest.fn().mockImplementation(() => execOf(trx));
    ModelMock.findByIdAndUpdate = jest
      .fn()
      .mockImplementation((_id, data) => execOf({ ...trx, ...data }));
    ModelMock.findOneAndUpdate = jest
      .fn()
      .mockImplementation((_filter, data) => execOf({ ...trx, ...data }));
    ModelMock.find = jest.fn().mockReturnValue(chainOf([trx]));
    ModelMock.countDocuments = jest.fn().mockReturnValue(execOf(1));
    ModelMock.aggregate = jest.fn().mockReturnValue(execOf([]));
    model = ModelMock;

    posItemService = {
      findActiveOrFail: jest
        .fn()
        .mockImplementation((id: string) =>
          Promise.resolve(id === beer._id.toString() ? beer : massage),
        ),
      decrementStock: jest.fn().mockResolvedValue(beer),
      incrementStock: jest.fn().mockResolvedValue(beer),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PosTransactionService,
        { provide: getModelToken(PosTransaction.name), useValue: model },
        { provide: PosItemService, useValue: posItemService },
      ],
    }).compile();

    service = module.get<PosTransactionService>(PosTransactionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const baseDto = () => ({
      property_id: propertyId.toString(),
      settlement_type: PosSettlementType.DIRECT,
      payment_method: PaymentMethod.CASH,
      items: [
        { item_id: beer._id.toString(), quantity: 2 },
        { item_id: massage._id.toString(), quantity: 1, discount: 5000 },
        { item_id: beer._id.toString(), quantity: 1 },
      ],
    });

    it('computes totals, decrements stock and saves', async () => {
      const result = await service.create(baseDto() as any);
      expect(result.status).toBe(PosTransactionStatus.COMPLETED);
      expect(result.transaction_number).toMatch(/^POS-/);
      expect(result.items).toHaveLength(3);
      // bières : 2000 + 360 ; 1000 + 180 ; massage : 20000 - 5000
      expect(result.subtotal).toBe(23000);
      expect(result.discount_total).toBe(5000);
      expect(result.tax_total).toBe(540);
      expect(result.total).toBe(18540);
      expect(result.currency).toBe('XOF');
      // quantités agrégées par article
      expect(posItemService.decrementStock).toHaveBeenCalledWith(
        beer._id.toString(),
        3,
      );
      expect(posItemService.decrementStock).toHaveBeenCalledWith(
        massage._id.toString(),
        1,
      );
    });

    it('requires a reservation for a room charge', async () => {
      await expect(
        service.create({
          ...baseDto(),
          settlement_type: PosSettlementType.ROOM_CHARGE,
        } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('requires a payment method for a direct payment', async () => {
      await expect(
        service.create({ ...baseDto(), payment_method: undefined } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects items from another property', async () => {
      posItemService.findActiveOrFail.mockResolvedValue({
        ...beer,
        property_id: new Types.ObjectId(),
      });
      await expect(service.create(baseDto() as any)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('rejects mixed currencies', async () => {
      posItemService.findActiveOrFail.mockImplementation((id: string) =>
        Promise.resolve(
          id === beer._id.toString()
            ? beer
            : { ...massage, price: { amount: 30, currency: 'EUR' } },
        ),
      );
      await expect(service.create(baseDto() as any)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('rejects a discount greater than the line amount', async () => {
      const dto = baseDto();
      dto.items[1].discount = 999999;
      await expect(service.create(dto as any)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('propagates 404 for an unknown item', async () => {
      posItemService.findActiveOrFail.mockRejectedValue(
        new NotFoundException(),
      );
      await expect(service.create(baseDto() as any)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(posItemService.decrementStock).not.toHaveBeenCalled();
    });

    it('rolls back decremented stock when stock is insufficient', async () => {
      posItemService.decrementStock
        .mockResolvedValueOnce(beer)
        .mockRejectedValueOnce(new BadRequestException('Stock insuffisant'));
      await expect(service.create(baseDto() as any)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(posItemService.incrementStock).toHaveBeenCalledTimes(1);
      expect(posItemService.incrementStock).toHaveBeenCalledWith(
        beer._id.toString(),
        3,
      );
    });
  });

  describe('void', () => {
    it('voids a completed transaction and restocks', async () => {
      const result = await service.void(trx._id.toString(), 'Erreur saisie');
      expect(result.status).toBe(PosTransactionStatus.VOIDED);
      expect(model.findOneAndUpdate.mock.calls[0][0].status).toBe(
        PosTransactionStatus.COMPLETED,
      );
      expect(posItemService.incrementStock).toHaveBeenCalledWith(
        beer._id.toString(),
        2,
      );
    });

    it('rejects an already voided transaction', async () => {
      trx.status = PosTransactionStatus.VOIDED;
      await expect(
        service.void(trx._id.toString(), 'x'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(posItemService.incrementStock).not.toHaveBeenCalled();
    });

    it('rejects a refunded transaction', async () => {
      trx.status = PosTransactionStatus.REFUNDED;
      await expect(
        service.void(trx._id.toString(), 'x'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a settled room charge', async () => {
      trx.is_settled = true;
      await expect(
        service.void(trx._id.toString(), 'x'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects when a concurrent update happened', async () => {
      model.findOneAndUpdate.mockReturnValue(execOf(null));
      await expect(
        service.void(trx._id.toString(), 'x'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(posItemService.incrementStock).not.toHaveBeenCalled();
    });

    it('throws 404 for an unknown transaction', async () => {
      model.findById.mockReturnValue(execOf(null));
      await expect(
        service.void(trx._id.toString(), 'x'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('keeps going when restocking an item fails', async () => {
      posItemService.incrementStock.mockRejectedValue(new NotFoundException());
      const result = await service.void(trx._id.toString(), 'x');
      expect(result.status).toBe(PosTransactionStatus.VOIDED);
    });
  });

  describe('refund', () => {
    it('partially refunds', async () => {
      const result = await service.refund(trx._id.toString(), {
        amount: 1000,
        reason: 'Geste commercial',
      });
      expect(result.status).toBe(PosTransactionStatus.PARTIALLY_REFUNDED);
      expect(result.refunded_amount).toBe(1000);
      expect(posItemService.incrementStock).not.toHaveBeenCalled();
    });

    it('fully refunds the remaining amount and restocks on demand', async () => {
      trx.status = PosTransactionStatus.PARTIALLY_REFUNDED;
      trx.refunded_amount = 1000;
      const result = await service.refund(trx._id.toString(), {
        restock: true,
      });
      expect(result.status).toBe(PosTransactionStatus.REFUNDED);
      expect(result.refunded_amount).toBe(2360);
      expect(posItemService.incrementStock).toHaveBeenCalledWith(
        beer._id.toString(),
        2,
      );
    });

    it('rejects an amount above the remaining balance', async () => {
      await expect(
        service.refund(trx._id.toString(), { amount: 5000 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects refunding a voided transaction', async () => {
      trx.status = PosTransactionStatus.VOIDED;
      await expect(
        service.refund(trx._id.toString(), {}),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects when a concurrent update happened', async () => {
      model.findOneAndUpdate.mockReturnValue(execOf(null));
      await expect(
        service.refund(trx._id.toString(), {}),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('settle', () => {
    const invoiceId = new Types.ObjectId().toString();

    it('marks a room charge as posted to an invoice', async () => {
      const result = await service.settle(trx._id.toString(), invoiceId);
      expect(result.is_settled).toBe(true);
      expect(result.invoice_id?.toString()).toBe(invoiceId);
    });

    it('rejects a direct payment', async () => {
      trx.settlement_type = PosSettlementType.DIRECT;
      await expect(
        service.settle(trx._id.toString(), invoiceId),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects an already settled charge', async () => {
      trx.is_settled = true;
      await expect(
        service.settle(trx._id.toString(), invoiceId),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a voided transaction', async () => {
      trx.status = PosTransactionStatus.VOIDED;
      await expect(
        service.settle(trx._id.toString(), invoiceId),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('remove', () => {
    it('refuses to delete a non voided transaction', async () => {
      await expect(service.remove(trx._id.toString())).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('soft-deletes a voided transaction', async () => {
      trx.status = PosTransactionStatus.VOIDED;
      const result = await service.remove(trx._id.toString());
      expect(result.is_deleted).toBe(true);
    });
  });

  it('getRoomCharges sums unsettled charges net of refunds', async () => {
    model.find.mockReturnValue(
      chainOf([trx, { ...trx, total: 1000, refunded_amount: 400 }]),
    );
    const result = await service.getRoomCharges(reservationId.toString());
    expect(result.count).toBe(2);
    expect(result.total).toBe(2960);
    const filter = model.find.mock.calls[0][0];
    expect(filter.settlement_type).toBe(PosSettlementType.ROOM_CHARGE);
    expect(filter.is_settled).toEqual({ $ne: true });
  });

  it('getDailySales aggregates by outlet, settlement and method', async () => {
    model.find.mockReturnValue(
      chainOf([
        trx,
        {
          ...trx,
          settlement_type: PosSettlementType.DIRECT,
          payment_method: PaymentMethod.CASH,
          status: PosTransactionStatus.PARTIALLY_REFUNDED,
          refunded_amount: 360,
        },
        { ...trx, status: PosTransactionStatus.VOIDED },
      ]),
    );
    const report = await service.getDailySales(
      propertyId.toString(),
      new Date('2026-10-06T12:00:00'),
    );
    expect(report.transaction_count).toBe(2);
    expect(report.voided_count).toBe(1);
    expect(report.gross_sales).toBe(4720);
    expect(report.refunds).toBe(360);
    expect(report.net_sales).toBe(4360);
    expect(report.tax_total).toBe(720);
    expect(report.by_outlet[PosCategory.BAR]).toEqual({
      quantity: 4,
      revenue: 4720,
    });
    expect(report.by_settlement).toEqual({
      [PosSettlementType.ROOM_CHARGE]: 2360,
      [PosSettlementType.DIRECT]: 2360,
    });
    expect(report.by_payment_method[PaymentMethod.CASH]).toBe(2360);
  });

  it('getDailySales rejects an invalid date', async () => {
    await expect(
      service.getDailySales(propertyId.toString(), new Date('nope')),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('getTopSellingItems runs an aggregation pipeline', async () => {
    model.aggregate.mockReturnValue(
      execOf([{ item_id: beer._id, name: 'Bière', quantity: 12 }]),
    );
    const result = await service.getTopSellingItems(
      propertyId.toString(),
      new Date('2026-10-01'),
      new Date('2026-10-31'),
      5,
    );
    expect(result[0].quantity).toBe(12);
    const pipeline = model.aggregate.mock.calls[0][0];
    expect(pipeline[0].$match.transaction_date.$gte).toEqual(
      new Date('2026-10-01'),
    );
    expect(pipeline).toContainEqual({ $limit: 5 });
  });

  it('getTopSellingItems rejects an inverted period', async () => {
    await expect(
      service.getTopSellingItems(
        propertyId.toString(),
        new Date('2026-10-31'),
        new Date('2026-10-01'),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('findAll applies filters', async () => {
    await service.findAll({
      page: 1,
      limit: 10,
      property_id: propertyId.toString(),
      status: PosTransactionStatus.COMPLETED,
      from: '2026-10-01',
    } as any);
    const filter = model.find.mock.calls[0][0];
    expect(filter.status).toBe(PosTransactionStatus.COMPLETED);
    expect(filter.transaction_date.$gte).toEqual(new Date('2026-10-01'));
  });

  it('findByNumber uppercases the number', async () => {
    await service.findByNumber('pos-1-abc');
    expect(model.findOne).toHaveBeenCalledWith({
      transaction_number: 'POS-1-ABC',
    });
  });

  it('findByReservation filters on reservation_id', async () => {
    await service.findByReservation(reservationId.toString(), {
      page: 1,
      limit: 10,
    });
    expect(model.find.mock.calls[0][0].reservation_id).toEqual(reservationId);
  });
});
