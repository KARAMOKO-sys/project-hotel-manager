/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return --
   Le modèle Mongoose est simulé par un objet jest non typé : ces règles ne s'appliquent pas aux mocks. */
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { KpiService } from './kpi.service';
import { Kpi, KpiMetric, KpiPeriodType } from '../schemas/kpi.entity';

describe('KpiService', () => {
  let service: KpiService;
  let model: any;
  let findChain: any;
  let existing: any;

  const propertyId = new Types.ObjectId().toString();
  const baseDto = {
    property_id: propertyId,
    period_type: KpiPeriodType.DAILY,
    period_start: '2026-10-01',
    period_end: '2026-10-01',
    rooms_available: 50,
    rooms_sold: 40,
    room_revenue: 2_000_000,
  };

  beforeEach(async () => {
    existing = {
      _id: new Types.ObjectId(),
      property_id: new Types.ObjectId(propertyId),
      period_type: KpiPeriodType.MONTHLY,
      period_start: new Date('2026-09-01'),
      period_end: new Date('2026-09-30'),
      rooms_available: 100,
      rooms_sold: 50,
      room_revenue: 5_000_000,
      occupancy_rate: 50,
      adr: 100_000,
      revpar: 50_000,
    };
    findChain = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    };
    const ModelMock: any = function (data: any) {
      const doc = { ...data };
      doc.save = jest.fn().mockResolvedValue(doc);
      return doc;
    };
    ModelMock.find = jest.fn().mockReturnValue(findChain);
    ModelMock.countDocuments = jest
      .fn()
      .mockReturnValue({ exec: jest.fn().mockResolvedValue(0) });
    ModelMock.findById = jest.fn().mockImplementation(() => ({
      exec: jest.fn().mockResolvedValue(existing),
    }));
    ModelMock.findByIdAndUpdate = jest.fn().mockImplementation((_id, data) => ({
      exec: jest.fn().mockResolvedValue({ ...existing, ...data }),
    }));
    model = ModelMock;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KpiService,
        { provide: getModelToken(Kpi.name), useValue: model },
      ],
    }).compile();

    service = module.get(KpiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should calculate without persisting', () => {
    expect(
      service.calculate({
        rooms_available: 0,
        rooms_sold: 0,
        room_revenue: 0,
      }).occupancy_rate,
    ).toBe(0);
  });

  it('should reject inconsistent inputs', () => {
    expect(() =>
      service.calculate({ rooms_available: 1, rooms_sold: 2, room_revenue: 0 }),
    ).toThrow(BadRequestException);
  });

  it('should create a snapshot with computed metrics', async () => {
    const result = await service.create(baseDto);
    expect(result.occupancy_rate).toBe(80);
    expect(result.adr).toBe(50_000);
    expect(result.revpar).toBe(40_000);
    expect(result.goppar).toBeUndefined();
    expect(result.computed_at).toBeInstanceOf(Date);
  });

  it('should reject an inverted period', async () => {
    await expect(
      service.create({ ...baseDto, period_end: '2026-09-01' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should map duplicate key errors to 409', async () => {
    const ModelWithDup: any = function (data: any) {
      return {
        ...data,
        save: jest.fn().mockRejectedValue({ code: 11000 }),
      };
    };
    const module = await Test.createTestingModule({
      providers: [
        KpiService,
        { provide: getModelToken(Kpi.name), useValue: ModelWithDup },
      ],
    }).compile();
    await expect(module.get(KpiService).create(baseDto)).rejects.toThrow(
      ConflictException,
    );
  });

  it('should recompute metrics when raw inputs are updated', async () => {
    const result = await service.update(existing._id.toString(), {
      rooms_sold: 80,
    });
    const update = model.findByIdAndUpdate.mock.calls[0][1];
    expect(update.occupancy_rate).toBe(80);
    expect(update.adr).toBe(62_500);
    expect(result.revpar).toBe(50_000);
  });

  it('should not recompute on metadata-only updates', async () => {
    await service.update(existing._id.toString(), { metadata: { a: 1 } });
    expect(model.findById).not.toHaveBeenCalled();
  });

  it('should reject updates leading to occupancy > 100 %', async () => {
    await expect(
      service.update(existing._id.toString(), { rooms_sold: 150 }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should return the latest snapshot or 404', async () => {
    findChain.exec.mockResolvedValueOnce([existing]);
    await expect(service.getLatest(propertyId)).resolves.toBe(existing);
    await expect(
      service.getLatest(propertyId, KpiPeriodType.DAILY),
    ).rejects.toThrow(NotFoundException);
  });

  it('should build a metric trend', async () => {
    findChain.exec.mockResolvedValue([
      existing,
      { ...existing, period_start: new Date('2026-10-01'), adr: undefined },
    ]);
    const trend = await service.getTrend(propertyId, {
      metric: KpiMetric.ADR,
      from: '2026-01-01',
    });
    expect(trend.map((p) => p.value)).toEqual([100_000, null]);
    expect(findChain.sort).toHaveBeenCalledWith('period_start');
  });

  it('should reject unknown metrics', async () => {
    await expect(
      service.getTrend(propertyId, { metric: 'foo' as KpiMetric }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should compare with the previous period', async () => {
    findChain.exec.mockResolvedValue([
      { ...existing, occupancy_rate: 40, adr: 80_000, revpar: 0 },
    ]);
    const result = await service.compareWithPrevious(existing._id.toString());
    expect(result.variations.occupancy_rate).toMatchObject({
      absolute: 10,
      percent: 25,
      trend: 'up',
    });
    expect(result.variations.revpar?.percent).toBeNull();
    expect(model.find.mock.calls[0][0].period_start).toEqual({
      $lt: existing.period_start,
    });
  });

  it('should handle a first period without previous snapshot', async () => {
    const result = await service.compareWithPrevious(existing._id.toString());
    expect(result.previous).toBeNull();
    expect(result.variations.adr?.trend).toBeNull();
  });

  it('should compare two provided periods', () => {
    const result = service.comparePeriods({
      current: { rooms_available: 100, rooms_sold: 80, room_revenue: 8000 },
      previous: { rooms_available: 100, rooms_sold: 0, room_revenue: 0 },
    });
    expect(result.variations.room_revenue?.percent).toBeNull();
    expect(result.variations.occupancy_rate?.absolute).toBe(80);
  });
});
