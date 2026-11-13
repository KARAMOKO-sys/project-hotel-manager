/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return --
   Le modèle Mongoose est simulé par un objet jest non typé : ces règles ne s'appliquent pas aux mocks. */
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import {
  DEFAULT_ALERT_THRESHOLD,
  SentimentAnalysisService,
} from './sentiment-analysis.service';
import {
  ReviewAspect,
  ReviewSource,
  SentimentAnalysis,
  SentimentLabel,
} from '../schemas/sentiment-analysis.entity';

describe('SentimentAnalysisService', () => {
  let service: SentimentAnalysisService;
  let model: any;
  let findChain: any;
  let existing: any;

  const propertyId = new Types.ObjectId().toString();

  beforeEach(async () => {
    existing = {
      _id: new Types.ObjectId(),
      property_id: new Types.ObjectId(propertyId),
      text: 'Hôtel parfait',
      rating: 5,
      score: 0.6,
      label: SentimentLabel.POSITIVE,
      is_alert: false,
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
        SentimentAnalysisService,
        { provide: getModelToken(SentimentAnalysis.name), useValue: model },
      ],
    }).compile();

    service = module.get(SentimentAnalysisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should analyze and persist a negative review as an alert', async () => {
    const result = await service.create({
      property_id: propertyId,
      text: 'Chambre sale et personnel impoli, très déçu.',
      source: ReviewSource.GOOGLE,
    });
    expect(result.label).toBe(SentimentLabel.NEGATIVE);
    expect(result.is_alert).toBe(true);
    expect(result.source).toBe(ReviewSource.GOOGLE);
    expect(result.aspects.map((a) => a.aspect)).toEqual(
      expect.arrayContaining([ReviewAspect.CLEANLINESS, ReviewAspect.STAFF]),
    );
    expect(result.model_version).toBe('lexicon-v1');
  });

  it('should raise an alert on low rating even with neutral text', async () => {
    const result = await service.create({
      property_id: propertyId,
      text: 'Séjour de deux nuits.',
      rating: 1,
    });
    expect(result.label).toBe(SentimentLabel.NEUTRAL);
    expect(result.is_alert).toBe(true);
    expect(result.source).toBe(ReviewSource.INTERNAL);
  });

  it('should not re-score when text and rating are unchanged', async () => {
    await service.update(existing._id.toString(), { source_ref: 'x' });
    expect(model.findById).not.toHaveBeenCalled();
    expect(model.findByIdAndUpdate.mock.calls[0][1]).toEqual({
      source_ref: 'x',
    });
  });

  it('should re-score when text changes', async () => {
    const result = await service.update(existing._id.toString(), {
      text: 'Horrible experience, awful food',
    });
    expect(result.label).toBe(SentimentLabel.NEGATIVE);
    expect(result.is_alert).toBe(true);
  });

  it('should throw 404 when updating text of an unknown review', async () => {
    existing = null;
    await expect(
      service.update(new Types.ObjectId().toString(), { text: 'bad' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('should summarize a property with no reviews', async () => {
    const summary = await service.getSummary(propertyId);
    expect(summary.total).toBe(0);
    expect(summary.average_score).toBe(0);
  });

  it('should apply the date range when summarizing', async () => {
    await service.getSummary(propertyId, {
      from: '2026-01-01',
      to: '2026-01-31',
    });
    const filter = model.find.mock.calls[0][0];
    expect(filter.analyzed_at.$gte).toEqual(new Date('2026-01-01'));
    expect(filter.analyzed_at.$lte).toEqual(new Date('2026-01-31'));
  });

  it('should reject an inverted date range', async () => {
    await expect(
      service.getSummary(propertyId, { from: '2026-02-01', to: '2026-01-01' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should list unacknowledged alerts under the threshold', async () => {
    findChain.exec.mockResolvedValue([existing]);
    await service.getAlerts(propertyId);
    const filter = model.find.mock.calls[0][0];
    expect(filter.score).toEqual({ $lte: DEFAULT_ALERT_THRESHOLD });
    expect(filter.is_alert).toBe(true);
    expect(findChain.sort).toHaveBeenCalledWith('score');
  });

  it('should acknowledge an alert', async () => {
    existing.is_alert = true;
    const userId = new Types.ObjectId().toString();
    const result = await service.acknowledgeAlert(
      existing._id.toString(),
      userId,
    );
    expect(result.alert_acknowledged).toBe(true);
    expect(String(result.acknowledged_by)).toBe(userId);
  });

  it('should refuse to acknowledge a non-alert review', async () => {
    await expect(
      service.acknowledgeAlert(existing._id.toString()),
    ).rejects.toThrow(BadRequestException);
  });

  it('should return improvement suggestions from stored reviews', async () => {
    findChain.exec.mockResolvedValue([
      {
        score: -0.5,
        label: SentimentLabel.NEGATIVE,
        aspects: [
          {
            aspect: ReviewAspect.NOISE,
            score: -0.6,
            label: SentimentLabel.NEGATIVE,
            mentions: 1,
          },
        ],
      },
    ]);
    const suggestions = await service.getImprovementSuggestions(propertyId);
    expect(suggestions[0].aspect).toBe(ReviewAspect.NOISE);
  });

  it('should build trends', async () => {
    findChain.exec.mockResolvedValue([
      {
        score: 0.5,
        label: SentimentLabel.POSITIVE,
        analyzed_at: new Date('2026-03-01'),
      },
    ]);
    const trends = await service.getTrends(propertyId, { granularity: 'day' });
    expect(trends).toEqual([
      { period: '2026-03-01', count: 1, average_score: 0.5, negative_share: 0 },
    ]);
  });

  it('should reject invalid property ids', () => {
    expect(() =>
      service.findByProperty('nope', { page: 1, limit: 10 } as any),
    ).toThrow(BadRequestException);
  });
});
