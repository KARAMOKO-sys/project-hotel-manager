/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return --
   Le modèle Mongoose est simulé par un objet jest non typé : ces règles ne s'appliquent pas aux mocks. */
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { IaPredictionService } from './ia-prediction.service';
import {
  ForecastMethod,
  IaPrediction,
  PredictionStatus,
  PredictionType,
} from '../schemas/ia-prediction.entity';

describe('IaPredictionService', () => {
  let service: IaPredictionService;
  let model: any;
  let findChain: any;
  let existing: any;

  const propertyId = new Types.ObjectId().toString();
  const baseForecast = {
    property_id: propertyId,
    type: PredictionType.OCCUPANCY,
    target: 'property',
  };

  beforeEach(async () => {
    existing = {
      _id: new Types.ObjectId(),
      predicted_value: 80,
      status: PredictionStatus.PENDING,
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
        IaPredictionService,
        { provide: getModelToken(IaPrediction.name), useValue: model },
      ],
    }).compile();

    service = module.get(IaPredictionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('forecast', () => {
    it('should persist one prediction per day starting at start_date', async () => {
      const result = await service.forecast({
        ...baseForecast,
        history: [60, 62, 64, 66],
        horizon: 3,
        start_date: '2030-01-10',
        max_value: 100,
      });
      expect(result.method).toBe(ForecastMethod.LINEAR_TREND);
      expect(result.predictions).toHaveLength(3);
      expect(result.predictions.map((p) => p.predicted_value)).toEqual([
        68, 70, 72,
      ]);
      expect(result.predictions[2].target_date.toISOString()).toBe(
        '2030-01-12T00:00:00.000Z',
      );
      expect(result.predictions[0].horizon_days).toBeGreaterThan(0);
      expect(result.predictions[0].model_version).toBe('heuristic-v1');
      expect(result.predictions[0].status).toBe(PredictionStatus.PENDING);
    });

    it('should default to a 7-day horizon starting tomorrow', async () => {
      const result = await service.forecast({
        ...baseForecast,
        history: [5],
        persist: false,
      });
      expect(result.points).toHaveLength(7);
      expect(result.predictions).toEqual([]);
      expect(result.target_dates[0].getTime()).toBeGreaterThan(Date.now() - 1);
    });

    it('should reject an empty history', async () => {
      await expect(
        service.forecast({ ...baseForecast, history: [] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should map forecaster errors to 400', async () => {
      await expect(
        service.forecast({ ...baseForecast, history: [1, NaN] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject inverted bounds', async () => {
      await expect(
        service.forecast({
          ...baseForecast,
          history: [1, 2],
          min_value: 10,
          max_value: 0,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  it('should create a manual prediction with a computed horizon', async () => {
    const target = new Date(Date.now() + 3 * 86400000).toISOString();
    const result = await service.create({
      ...baseForecast,
      target_date: target,
      predicted_value: 75,
    });
    expect(result.method).toBe(ForecastMethod.MANUAL);
    expect(result.horizon_days).toBe(3);
  });

  describe('recordActual', () => {
    it('should compute absolute and percentage errors', async () => {
      const result = await service.recordActual(existing._id.toString(), 100);
      expect(result.absolute_error).toBe(20);
      expect(result.percentage_error).toBe(20);
      expect(result.status).toBe(PredictionStatus.EVALUATED);
    });

    it('should not compute a percentage error when actual is zero', async () => {
      const result = await service.recordActual(existing._id.toString(), 0);
      expect(result.absolute_error).toBe(80);
      expect(result.percentage_error).toBeUndefined();
    });

    it('should throw 404 for unknown predictions', async () => {
      existing = null;
      await expect(
        service.recordActual(new Types.ObjectId().toString(), 1),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject non finite values', async () => {
      await expect(
        service.recordActual(existing._id.toString(), Infinity),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getAccuracy', () => {
    it('should aggregate MAPE globally and by type', async () => {
      findChain.exec.mockResolvedValue([
        {
          type: PredictionType.OCCUPANCY,
          predicted_value: 90,
          actual_value: 100,
        },
        { type: PredictionType.PRICE, predicted_value: 120, actual_value: 100 },
      ]);
      const report = await service.getAccuracy({
        property_id: propertyId,
        from: '2026-01-01',
        to: '2026-12-31',
      });
      expect(report.mape).toBe(15);
      expect(report.by_type.occupancy?.mape).toBe(10);
      expect(report.by_type.price?.mape).toBe(20);
      expect(model.find.mock.calls[0][0].status).toBe(
        PredictionStatus.EVALUATED,
      );
    });

    it('should return nulls when nothing was evaluated', async () => {
      const report = await service.getAccuracy();
      expect(report).toEqual({
        count: 0,
        mae: null,
        mape: null,
        accuracy: null,
        by_type: {},
      });
    });

    it('should reject an inverted period', async () => {
      await expect(
        service.getAccuracy({ from: '2026-02-01', to: '2026-01-01' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  it('should list predictions awaiting evaluation', async () => {
    await service.getPendingEvaluation(propertyId, 20);
    const filter = model.find.mock.calls[0][0];
    expect(filter.status).toBe(PredictionStatus.PENDING);
    expect(filter.target_date.$lte).toBeInstanceOf(Date);
    expect(findChain.limit).toHaveBeenCalledWith(20);
  });

  it('should reject invalid property ids', () => {
    expect(() =>
      service.findByProperty('x', { page: 1, limit: 10 } as any),
    ).toThrow(BadRequestException);
  });
});
