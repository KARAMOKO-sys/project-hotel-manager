import { Test, TestingModule } from '@nestjs/testing';
import { GuestRequestController } from './guest-request.controller';
import { GuestRequestService } from '../services/guest-request.service';

describe('GuestRequestController', () => {
  let controller: GuestRequestController;
  let service: GuestRequestService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GuestRequestController],
      providers: [
        {
          provide: GuestRequestService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            assign: jest.fn(),
            complete: jest.fn(),
            cancel: jest.fn(),
            getRequestsByGuest: jest.fn(),
            getRequestsByRoom: jest.fn(),
            getPendingRequests: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<GuestRequestController>(GuestRequestController);
    service = module.get<GuestRequestService>(GuestRequestService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate complete to the service', () => {
    controller.complete({ id: '507f1f77bcf86cd799439011' } as any);
    expect(service.complete).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
  });
});
