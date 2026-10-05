import { Test, TestingModule } from '@nestjs/testing';
import { CampaignAnalyticController } from './campaign-analytic.controller';
import { CampaignAnalyticService } from '../services/campaign-analytic.service';

describe('CampaignAnalyticController', () => {
  let controller: CampaignAnalyticController;
  let service: CampaignAnalyticService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CampaignAnalyticController],
      providers: [
        {
          provide: CampaignAnalyticService,
          useValue: {
            trackOpen: jest.fn(),
            trackClick: jest.fn(),
            trackConversion: jest.fn(),
            getRealtimeStats: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<CampaignAnalyticController>(
      CampaignAnalyticController,
    );
    service = module.get<CampaignAnalyticService>(CampaignAnalyticService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate getRealtimeStats to the service', () => {
    controller.getRealtimeStats({ id: '507f1f77bcf86cd799439011' } as any);
    expect(service.getRealtimeStats).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439011',
    );
  });
});
