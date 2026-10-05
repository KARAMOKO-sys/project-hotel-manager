import { Test, TestingModule } from '@nestjs/testing';
import { GuestPreferenceController } from './guest-preference.controller';
import { GuestPreferenceService } from '../services/guest-preference.service';

describe('GuestPreferenceController', () => {
  let controller: GuestPreferenceController;
  let service: GuestPreferenceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GuestPreferenceController],
      providers: [
        {
          provide: GuestPreferenceService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            findByGuest: jest.fn(),
            updatePreference: jest.fn(),
            deletePreference: jest.fn(),
            getRecommendations: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<GuestPreferenceController>(
      GuestPreferenceController,
    );
    service = module.get<GuestPreferenceService>(GuestPreferenceService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate findByGuest to the service', () => {
    controller.findByGuest('507f1f77bcf86cd799439011');
    expect(service.findByGuest).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439011',
    );
  });
});
