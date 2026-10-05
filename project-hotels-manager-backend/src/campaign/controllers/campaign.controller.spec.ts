import { Test, TestingModule } from '@nestjs/testing';
import { CampaignController } from './campaign.controller';
import { CampaignService } from '../services/campaign.service';

describe('CampaignController', () => {
  let controller: CampaignController;
  let service: CampaignService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CampaignController],
      providers: [
        {
          provide: CampaignService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            findByProperty: jest.fn(),
            schedule: jest.fn(),
            cancel: jest.fn(),
            send: jest.fn(),
            getStatistics: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<CampaignController>(CampaignController);
    service = module.get<CampaignService>(CampaignService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate send to the service', () => {
    controller.send({ id: '507f1f77bcf86cd799439011' } as any);
    expect(service.send).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
  });
});
