import { Test, TestingModule } from '@nestjs/testing';
import { GuestController } from './guest.controller';
import { GuestService } from '../services/guest.service';

describe('GuestController', () => {
  let controller: GuestController;
  let service: GuestService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GuestController],
      providers: [
        {
          provide: GuestService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            search: jest.fn(),
            findByEmail: jest.fn(),
            updateProfile: jest.fn(),
            activate: jest.fn(),
            deactivate: jest.fn(),
            addLoyaltyPoints: jest.fn(),
            redeemLoyaltyPoints: jest.fn(),
            getLoyaltyHistory: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<GuestController>(GuestController);
    service = module.get<GuestService>(GuestService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate findByEmail to the service', () => {
    controller.findByEmail('guest@example.com');
    expect(service.findByEmail).toHaveBeenCalledWith('guest@example.com');
  });
});
