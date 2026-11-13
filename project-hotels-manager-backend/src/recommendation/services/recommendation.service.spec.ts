/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return --
   Le modèle Mongoose est simulé par un objet jest non typé : ces règles ne s'appliquent pas aux mocks. */
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { RecommendationService } from './recommendation.service';
import {
  Recommendation,
  RecommendationStatus,
  RecommendationType,
} from '../schemas/recommendation.entity';

describe('RecommendationService', () => {
  let service: RecommendationService;
  let model: any;
  let findChain: any;
  let existing: any;

  const guestId = new Types.ObjectId().toString();
  const propertyId = new Types.ObjectId().toString();
  const future = () => new Date(Date.now() + 86400000);

  beforeEach(async () => {
    existing = {
      _id: new Types.ObjectId(),
      guest_id: new Types.ObjectId(guestId),
      type: RecommendationType.UPSELL,
      title: 'Suite',
      score: 0.7,
      status: RecommendationStatus.PENDING,
      price: { amount: 40000, currency: 'XOF' },
      expires_at: future(),
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
    ModelMock.updateMany = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue({ modifiedCount: 4 }),
    });
    model = ModelMock;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationService,
        { provide: getModelToken(Recommendation.name), useValue: model },
      ],
    }).compile();

    service = module.get(RecommendationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateForGuest', () => {
    const dto = {
      guest_id: guestId,
      property_id: propertyId,
      profile: { preferences: ['spa'], average_spend: 20000 },
      candidates: [
        {
          title: 'Spa',
          type: RecommendationType.CROSS_SELL,
          category: 'spa',
          tags: ['spa'],
          price: 20000,
        },
        {
          title: 'Golf',
          type: RecommendationType.CROSS_SELL,
          category: 'golf',
          tags: ['golf'],
          price: 90000,
        },
      ],
    };

    it('should persist only candidates above the minimum score', async () => {
      const result = await service.generateForGuest(dto);
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Spa');
      expect(result[0].status).toBe(RecommendationStatus.PENDING);
      expect(result[0].price?.amount).toBe(20000);
      expect(result[0].price?.currency).toBe('XOF');
      expect(result[0].expires_at!.getTime()).toBeGreaterThan(Date.now());
      expect(result[0].reasons.length).toBeGreaterThan(0);
    });

    it('should return an empty list when there are no candidates', async () => {
      await expect(
        service.generateForGuest({ ...dto, candidates: [] }),
      ).resolves.toEqual([]);
    });

    it('should reject invalid guest ids', async () => {
      await expect(
        service.generateForGuest({ ...dto, guest_id: 'bad' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  it('should score candidates without persisting', () => {
    const result = service.scoreCandidates({
      profile: {},
      candidates: [{ title: 'X', type: RecommendationType.ROOM }],
      min_score: 0,
    });
    expect(result).toHaveLength(1);
  });

  it('should mark as shown', async () => {
    const result = await service.markAsShown(existing._id.toString());
    expect(result.status).toBe(RecommendationStatus.SHOWN);
    expect(result.shown_at).toBeInstanceOf(Date);
  });

  it('should be idempotent when already shown', async () => {
    existing.status = RecommendationStatus.SHOWN;
    await service.markAsShown(existing._id.toString());
    expect(model.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('should accept with the price as revenue by default', async () => {
    const result = await service.accept(existing._id.toString());
    expect(result.status).toBe(RecommendationStatus.ACCEPTED);
    expect(result.revenue_generated).toBe(40000);
  });

  it('should accept with an explicit revenue', async () => {
    const result = await service.accept(existing._id.toString(), {
      revenue: 35000,
    });
    expect(result.revenue_generated).toBe(35000);
  });

  it('should dismiss with a reason', async () => {
    const result = await service.dismiss(existing._id.toString(), 'Trop cher');
    expect(result.status).toBe(RecommendationStatus.DISMISSED);
    expect(result.dismiss_reason).toBe('Trop cher');
  });

  it('should refuse to answer an already processed recommendation', async () => {
    existing.status = RecommendationStatus.ACCEPTED;
    await expect(service.dismiss(existing._id.toString())).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should refuse to accept an expired recommendation', async () => {
    existing.expires_at = new Date(Date.now() - 1000);
    await expect(service.accept(existing._id.toString())).rejects.toThrow(
      'Recommandation expirée',
    );
  });

  it('should expire outdated recommendations', async () => {
    await expect(service.expireOutdated()).resolves.toEqual({ expired: 4 });
  });

  it('should list active recommendations sorted by score', async () => {
    await service.getActiveForGuest(guestId);
    expect(findChain.sort).toHaveBeenCalledWith('-score');
    expect(model.find.mock.calls[0][0].status).toEqual({
      $in: [RecommendationStatus.PENDING, RecommendationStatus.SHOWN],
    });
  });

  it('should compute conversion stats with filters', async () => {
    findChain.exec.mockResolvedValue([
      {
        type: RecommendationType.UPSELL,
        status: RecommendationStatus.ACCEPTED,
        revenue_generated: 10,
      },
    ]);
    const stats = await service.getConversionStats({
      property_id: propertyId,
      from: '2026-01-01',
    });
    expect(stats.conversion_rate).toBe(100);
    const filter = model.find.mock.calls[0][0];
    expect(filter.created_at.$gte).toEqual(new Date('2026-01-01'));
  });

  it('should reject an inverted stats period', async () => {
    await expect(
      service.getConversionStats({ from: '2026-02-01', to: '2026-01-01' }),
    ).rejects.toThrow(BadRequestException);
  });
});
