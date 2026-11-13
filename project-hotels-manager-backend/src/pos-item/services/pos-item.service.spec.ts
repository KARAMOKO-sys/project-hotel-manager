/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { PosItemService } from './pos-item.service';
import { PosCategory, PosItem } from '../schemas/pos-item.entity';

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

describe('PosItemService', () => {
  let service: PosItemService;
  let model: any;
  let item: any;
  const propertyId = new Types.ObjectId();

  beforeEach(async () => {
    item = {
      _id: new Types.ObjectId(),
      property_id: propertyId,
      name: 'Coca-Cola 33cl',
      sku: 'BAR-COCA',
      category: PosCategory.BAR,
      price: { amount: 1000, currency: 'XOF' },
      cost_price: 400,
      track_stock: true,
      stock_quantity: 10,
      low_stock_threshold: 5,
      is_active: true,
      is_deleted: false,
    };

    const ModelMock: any = function (data: any) {
      const doc = { ...data };
      doc.save = jest.fn().mockResolvedValue(doc);
      return doc;
    };
    ModelMock.findById = jest.fn().mockReturnValue(execOf(item));
    ModelMock.findByIdAndUpdate = jest
      .fn()
      .mockImplementation((_id, data) => execOf({ ...item, ...data }));
    ModelMock.findOneAndUpdate = jest
      .fn()
      .mockImplementation((_filter, update) =>
        execOf({
          ...item,
          stock_quantity: item.stock_quantity + update.$inc.stock_quantity,
        }),
      );
    ModelMock.find = jest.fn().mockReturnValue(chainOf([item]));
    ModelMock.countDocuments = jest.fn().mockReturnValue(execOf(1));
    ModelMock.exists = jest.fn().mockResolvedValue(null);
    model = ModelMock;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PosItemService,
        { provide: getModelToken(PosItem.name), useValue: model },
      ],
    }).compile();

    service = module.get<PosItemService>(PosItemService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const dto = {
      property_id: propertyId.toString(),
      name: 'Coca-Cola 33cl',
      sku: 'bar-coca',
      category: PosCategory.BAR,
      price: { amount: 1000 },
    };

    it('creates an item when the SKU is free', async () => {
      const result = await service.create(dto as any);
      expect(result.name).toBe('Coca-Cola 33cl');
      expect(model.exists).toHaveBeenCalledWith(
        expect.objectContaining({ sku: 'BAR-COCA' }),
      );
    });

    it('rejects a duplicate SKU with a 409', async () => {
      model.exists.mockResolvedValue({ _id: new Types.ObjectId() });
      await expect(service.create(dto as any)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('findAll', () => {
    it('applies property, category and search filters', async () => {
      const result = await service.findAll({
        page: 1,
        limit: 10,
        property_id: propertyId.toString(),
        category: PosCategory.BAR,
        search: 'coca',
      } as any);
      const filter = model.find.mock.calls[0][0];
      expect(filter.property_id).toEqual(propertyId);
      expect(filter.category).toBe(PosCategory.BAR);
      expect(filter.$or).toHaveLength(2);
      expect(filter.is_deleted).toEqual({ $ne: true });
      expect(result.meta.total).toBe(1);
    });
  });

  describe('update', () => {
    it('checks SKU uniqueness excluding the current item', async () => {
      await service.update(item._id.toString(), { sku: 'NEW' });
      const filter = model.exists.mock.calls[0][0];
      expect(filter._id).toEqual({ $ne: item._id });
    });

    it('throws 404 when the item does not exist', async () => {
      model.findByIdAndUpdate.mockReturnValue(execOf(null));
      await expect(
        service.update(item._id.toString(), { name: 'X' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  it('getCatalog returns active, available items', async () => {
    const result = await service.getCatalog(
      propertyId.toString(),
      PosCategory.BAR,
    );
    const filter = model.find.mock.calls[0][0];
    expect(filter.is_active).toBe(true);
    expect(filter.category).toBe(PosCategory.BAR);
    expect(filter.$or).toEqual([
      { track_stock: false },
      { stock_quantity: { $gt: 0 } },
    ]);
    expect(result).toEqual([item]);
  });

  it('getLowStockItems compares stock with the threshold', async () => {
    await service.getLowStockItems(propertyId.toString());
    const filter = model.find.mock.calls[0][0];
    expect(filter.$expr).toEqual({
      $lte: ['$stock_quantity', '$low_stock_threshold'],
    });
  });

  it('getInventory computes value and alerts', async () => {
    model.find.mockReturnValue(
      chainOf([
        item,
        { ...item, name: 'Eau', stock_quantity: 0, cost_price: 100 },
        { ...item, name: 'Bière', stock_quantity: 3, cost_price: undefined },
      ]),
    );
    const result = await service.getInventory(propertyId.toString());
    expect(result.total_items).toBe(3);
    expect(result.out_of_stock_count).toBe(1);
    expect(result.low_stock_count).toBe(2);
    expect(result.stock_value).toBe(10 * 400 + 0 + 3 * 1000);
    expect(result.items[0].is_low_stock).toBe(false);
  });

  describe('decrementStock', () => {
    it('decrements atomically with a stock >= qty condition', async () => {
      const result = await service.decrementStock(item._id.toString(), 3);
      expect(result.stock_quantity).toBe(7);
      const [filter, update] = model.findOneAndUpdate.mock.calls[0];
      expect(filter.stock_quantity).toEqual({ $gte: 3 });
      expect(update).toEqual({ $inc: { stock_quantity: -3 } });
    });

    it('throws 400 on insufficient stock', async () => {
      model.findOneAndUpdate.mockReturnValue(execOf(null));
      await expect(
        service.decrementStock(item._id.toString(), 50),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('does not touch stock for non-tracked items', async () => {
      model.findById.mockReturnValue(execOf({ ...item, track_stock: false }));
      await service.decrementStock(item._id.toString(), 2);
      expect(model.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('throws 400 for an inactive item', async () => {
      model.findById.mockReturnValue(execOf({ ...item, is_active: false }));
      await expect(
        service.decrementStock(item._id.toString(), 1),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws 404 for an unknown item', async () => {
      model.findById.mockReturnValue(execOf(null));
      await expect(
        service.decrementStock(item._id.toString(), 1),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects a non positive quantity', async () => {
      await expect(
        service.decrementStock(item._id.toString(), 0),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('adjustStock', () => {
    it('increments on positive delta', async () => {
      const result = await service.adjustStock(item._id.toString(), 5);
      expect(result.stock_quantity).toBe(15);
    });

    it('decrements on negative delta', async () => {
      const result = await service.adjustStock(item._id.toString(), -4);
      expect(result.stock_quantity).toBe(6);
    });

    it('rejects a zero delta', async () => {
      await expect(
        service.adjustStock(item._id.toString(), 0),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('setStock', () => {
    it('sets an absolute quantity', async () => {
      const result = await service.setStock(item._id.toString(), 42);
      expect(result.stock_quantity).toBe(42);
    });

    it('refuses for a non-tracked item', async () => {
      model.findById.mockReturnValue(execOf({ ...item, track_stock: false }));
      await expect(
        service.setStock(item._id.toString(), 3),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('refuses a negative quantity', async () => {
      await expect(
        service.setStock(item._id.toString(), -1),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  it('activate / deactivate toggle is_active', async () => {
    expect((await service.deactivate(item._id.toString())).is_active).toBe(
      false,
    );
    expect((await service.activate(item._id.toString())).is_active).toBe(true);
  });

  it('isLowStock respects the threshold', () => {
    expect(
      service.isLowStock({
        track_stock: true,
        stock_quantity: 5,
        low_stock_threshold: 5,
      }),
    ).toBe(true);
    expect(
      service.isLowStock({
        track_stock: false,
        stock_quantity: 0,
        low_stock_threshold: 5,
      }),
    ).toBe(false);
  });
});
