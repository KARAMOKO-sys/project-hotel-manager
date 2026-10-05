import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { CampaignAnalyticService } from './campaign-analytic.service';
import { CampaignAnalytic } from '../schemas/campaign-analytic.entity';

describe('CampaignAnalyticService', () => {
  let service: CampaignAnalyticService;
  let model: any;

  const campaignId = new Types.ObjectId();

  beforeEach(async () => {
    model = {
      findById: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
      findByIdAndUpdate: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      }),
      countDocuments: jest.fn().mockResolvedValue(5),
      exists: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CampaignAnalyticService,
        { provide: getModelToken(CampaignAnalytic.name), useValue: model },
      ],
    }).compile();

    service = module.get<CampaignAnalyticService>(CampaignAnalyticService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return realtime stats', async () => {
    const result = await service.getRealtimeStats(campaignId.toString());
    expect(result.total).toBe(5);
    expect(result.opens).toBe(5);
  });
});
