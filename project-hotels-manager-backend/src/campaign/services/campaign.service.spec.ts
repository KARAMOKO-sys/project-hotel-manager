import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { CampaignService } from './campaign.service';
import { Campaign } from '../schemas/campaign.entity';
import { CampaignStatus } from '../../base-entities/enums/campaign-status.enum';

describe('CampaignService', () => {
  let service: CampaignService;
  let model: any;

  const campaign = {
    _id: new Types.ObjectId(),
    property_id: new Types.ObjectId(),
    name: 'Promo Été',
    status: CampaignStatus.DRAFT,
    recipient_count: 0,
  };

  beforeEach(async () => {
    model = {
      findById: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(campaign) }),
      findByIdAndUpdate: jest
        .fn()
        .mockReturnValue({
          exec: jest
            .fn()
            .mockResolvedValue({ ...campaign, status: CampaignStatus.SENT }),
        }),
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([campaign]),
      }),
      countDocuments: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(1) }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CampaignService,
        { provide: getModelToken(Campaign.name), useValue: model },
      ],
    }).compile();

    service = module.get<CampaignService>(CampaignService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should send a campaign', async () => {
    const result = await service.send(campaign._id.toString());
    expect(result.status).toBe(CampaignStatus.SENT);
  });

  it('should cancel a campaign', async () => {
    model.findByIdAndUpdate.mockReturnValue({
      exec: jest
        .fn()
        .mockResolvedValue({ ...campaign, status: CampaignStatus.CANCELLED }),
    });
    const result = await service.cancel(campaign._id.toString());
    expect(result.status).toBe(CampaignStatus.CANCELLED);
  });

  it('should return campaign statistics', async () => {
    const result = await service.getStatistics(campaign._id.toString());
    expect(result.recipient_count).toBe(0);
  });
});
