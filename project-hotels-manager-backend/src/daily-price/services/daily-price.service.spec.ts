/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return -- mocks Mongoose typés `any` */
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { DailyPriceService } from './daily-price.service';
import { DailyPrice, DailyPriceSource } from '../schemas/daily-price.entity';

const execOf = (value: unknown) => ({
  exec: jest.fn().mockResolvedValue(value),
});

describe('DailyPriceService', () => {
  let service: DailyPriceService;
  let model: any;
  let findChain: any;

  const propertyId = new Types.ObjectId();
  const roomTypeId = new Types.ObjectId();
  const ratePlanId = new Types.ObjectId();

  const priceOn = (day: string, amount: number, extra: object = {}) => ({
    _id: new Types.ObjectId(),
    property_id: propertyId,
    room_type_id: roomTypeId,
    rate_plan_id: null,
    date: new Date(`${day}T00:00:00.000Z`),
    price: { amount, currency: 'XOF' },
    is_closed: false,
    source: DailyPriceSource.MANUAL,
    ...extra,
  });

  beforeEach(async () => {
    const ModelMock: any = function (data: any) {
      const doc = { _id: new Types.ObjectId(), ...data };
      doc.save = jest.fn().mockResolvedValue(doc);
      return doc;
    };
    ModelMock.exists = jest.fn().mockResolvedValue(null);
    ModelMock.findOne = jest.fn().mockReturnValue(execOf(null));
    ModelMock.findOneAndUpdate = jest
      .fn()
      .mockImplementation((filter: any, update: any) =>
        execOf({ ...filter, ...update.$set }),
      );
    ModelMock.findByIdAndDelete = jest
      .fn()
      .mockReturnValue(execOf(priceOn('2026-12-01', 1)));
    ModelMock.bulkWrite = jest
      .fn()
      .mockResolvedValue({ upsertedCount: 2, modifiedCount: 1 });
    findChain = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    };
    ModelMock.find = jest.fn().mockReturnValue(findChain);
    model = ModelMock;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DailyPriceService,
        { provide: getModelToken(DailyPrice.name), useValue: model },
      ],
    }).compile();

    service = module.get<DailyPriceService>(DailyPriceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const dto = () => ({
      property_id: propertyId.toString(),
      room_type_id: roomTypeId.toString(),
      date: '2026-12-01T15:30:00.000Z',
      price: { amount: 60000 },
    });

    it('should create a price normalised to UTC midnight', async () => {
      const result = await service.create(dto());
      expect(result.date.toISOString()).toBe('2026-12-01T00:00:00.000Z');
      expect(result.rate_plan_id).toBeNull();
    });

    it('should reject a duplicate price for the same night', async () => {
      model.exists.mockResolvedValue({ _id: new Types.ObjectId() });
      await expect(service.create(dto())).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('should reject an invalid date', async () => {
      await expect(
        service.create({ ...dto(), date: 'nope' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  it('should upsert a price with setPrice', async () => {
    const result = await service.setPrice({
      property_id: propertyId.toString(),
      room_type_id: roomTypeId.toString(),
      rate_plan_id: ratePlanId.toString(),
      date: '2026-12-01',
      price: { amount: 65000 },
    });
    const [filter, , options] = model.findOneAndUpdate.mock.calls[0];
    expect(filter.rate_plan_id).toEqual(ratePlanId);
    expect(options).toMatchObject({ upsert: true, new: true });
    expect(result.source).toBe(DailyPriceSource.MANUAL);
  });

  describe('bulkSetPrices', () => {
    const dto = (extra: object = {}) => ({
      property_id: propertyId.toString(),
      room_type_id: roomTypeId.toString(),
      start_date: '2026-12-01',
      end_date: '2026-12-07',
      price: { amount: 80000 },
      ...extra,
    });

    it('should upsert one operation per night (inclusive range)', async () => {
      const result = await service.bulkSetPrices(dto());
      expect(result).toEqual({ dates: 7, upserted: 2, modified: 1 });
      const ops = model.bulkWrite.mock.calls[0][0];
      expect(ops).toHaveLength(7);
      expect(ops[0].updateOne.upsert).toBe(true);
      expect(ops[0].updateOne.update.$set.source).toBe(DailyPriceSource.BULK);
    });

    it('should restrict to the requested days of week', async () => {
      // 2026-12-05 = samedi (6), 2026-12-06 = dimanche (0)
      const result = await service.bulkSetPrices(dto({ days_of_week: [0, 6] }));
      expect(result.dates).toBe(2);
      const ops = model.bulkWrite.mock.calls[0][0];
      expect(ops[0].updateOne.filter.date.toISOString()).toBe(
        '2026-12-05T00:00:00.000Z',
      );
    });

    it('should reject an end date before the start date', async () => {
      await expect(
        service.bulkSetPrices(dto({ end_date: '2026-11-01' })),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(model.bulkWrite).not.toHaveBeenCalled();
    });

    it('should reject a range longer than one year', async () => {
      await expect(
        service.bulkSetPrices(dto({ end_date: '2028-01-01' })),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should reject when no day matches', async () => {
      await expect(
        service.bulkSetPrices(
          dto({
            start_date: '2026-12-01',
            end_date: '2026-12-01',
            days_of_week: [0],
          }),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('getCalendar', () => {
    it('should return every day with null for missing prices', async () => {
      findChain.exec.mockResolvedValue([
        priceOn('2026-12-01', 50000),
        priceOn('2026-12-03', 55000, { is_closed: true }),
      ]);
      const calendar = await service.getCalendar(
        roomTypeId.toString(),
        '2026-12-01',
        '2026-12-03',
      );
      expect(calendar.days).toHaveLength(3);
      expect(calendar.days[0]).toMatchObject({
        date: '2026-12-01',
        price: 50000,
      });
      expect(calendar.days[1]).toMatchObject({
        date: '2026-12-02',
        price: null,
      });
      expect(calendar.days[2].is_closed).toBe(true);
      expect(model.find.mock.calls[0][0].rate_plan_id).toBeNull();
    });

    it('should reject an inverted range', async () => {
      await expect(
        service.getCalendar(roomTypeId.toString(), '2026-12-03', '2026-12-01'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('getPriceForDate', () => {
    it('should return the price of a night', async () => {
      const price = priceOn('2026-12-01', 50000);
      model.findOne.mockReturnValue(execOf(price));
      await expect(
        service.getPriceForDate(roomTypeId.toString(), '2026-12-01'),
      ).resolves.toEqual(price);
    });

    it('should throw NotFound when no price is defined', async () => {
      await expect(
        service.getPriceForDate(roomTypeId.toString(), '2026-12-01'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('calculateStayPrice', () => {
    it('should sum nightly prices (check-out night excluded)', async () => {
      findChain.exec.mockResolvedValue([
        priceOn('2026-12-01', 50000),
        priceOn('2026-12-02', 60000),
      ]);
      const result = await service.calculateStayPrice(
        roomTypeId.toString(),
        '2026-12-01',
        '2026-12-03',
      );
      expect(result).toMatchObject({
        nights: 2,
        total: 110000,
        average_per_night: 55000,
        currency: 'XOF',
      });
      expect(result.breakdown).toEqual([
        { date: '2026-12-01', amount: 50000 },
        { date: '2026-12-02', amount: 60000 },
      ]);
    });

    it('should reject a check-out before check-in', async () => {
      await expect(
        service.calculateStayPrice(
          roomTypeId.toString(),
          '2026-12-03',
          '2026-12-03',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should reject when a night has no price', async () => {
      findChain.exec.mockResolvedValue([priceOn('2026-12-01', 50000)]);
      await expect(
        service.calculateStayPrice(
          roomTypeId.toString(),
          '2026-12-01',
          '2026-12-03',
        ),
      ).rejects.toThrow(/2026-12-02/);
    });

    it('should reject when a night is closed to sale', async () => {
      findChain.exec.mockResolvedValue([
        priceOn('2026-12-01', 50000),
        priceOn('2026-12-02', 50000, { is_closed: true }),
      ]);
      await expect(
        service.calculateStayPrice(
          roomTypeId.toString(),
          '2026-12-01',
          '2026-12-03',
        ),
      ).rejects.toThrow(/fermée/);
    });

    it('should enforce the arrival day minimum stay', async () => {
      findChain.exec.mockResolvedValue([
        priceOn('2026-12-01', 50000, { min_stay: 3 }),
        priceOn('2026-12-02', 50000),
      ]);
      await expect(
        service.calculateStayPrice(
          roomTypeId.toString(),
          '2026-12-01',
          '2026-12-03',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should reject mixed currencies', async () => {
      findChain.exec.mockResolvedValue([
        priceOn('2026-12-01', 50000),
        {
          ...priceOn('2026-12-02', 80),
          price: { amount: 80, currency: 'EUR' },
        },
      ]);
      await expect(
        service.calculateStayPrice(
          roomTypeId.toString(),
          '2026-12-01',
          '2026-12-03',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should hard delete a daily price', async () => {
      await service.remove(new Types.ObjectId().toString());
      expect(model.findByIdAndDelete).toHaveBeenCalled();
    });

    it('should throw NotFound for an unknown price', async () => {
      model.findByIdAndDelete.mockReturnValue(execOf(null));
      await expect(
        service.remove(new Types.ObjectId().toString()),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
