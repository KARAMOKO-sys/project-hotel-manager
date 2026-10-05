import { Test, TestingModule } from '@nestjs/testing';
import { GuestSegmentController } from './guest-segment.controller';
import { GuestSegmentService } from '../services/guest-segment.service';

describe('GuestSegmentController', () => {
  let controller: GuestSegmentController;
  let service: GuestSegmentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GuestSegmentController],
      providers: [
        {
          provide: GuestSegmentService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            findByProperty: jest.fn(),
            activate: jest.fn(),
            deactivate: jest.fn(),
            getStatistics: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<GuestSegmentController>(GuestSegmentController);
    service = module.get<GuestSegmentService>(GuestSegmentService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate activate to the service', () => {
    controller.activate({ id: '507f1f77bcf86cd799439011' } as any);
    expect(service.activate).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
  });
});
