import { Test, TestingModule } from '@nestjs/testing';
import { HousekeepingController } from './housekeeping.controller';
import { HousekeepingService } from '../services/housekeeping.service';

describe('HousekeepingController', () => {
  let controller: HousekeepingController;
  let service: HousekeepingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HousekeepingController],
      providers: [
        {
          provide: HousekeepingService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            assignTask: jest.fn(),
            startTask: jest.fn(),
            completeTask: jest.fn(),
            skipTask: jest.fn(),
            getTasksByStaff: jest.fn(),
            getTasksByRoom: jest.fn(),
            getPendingTasks: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<HousekeepingController>(HousekeepingController);
    service = module.get<HousekeepingService>(HousekeepingService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate startTask to the service', () => {
    controller.startTask({ id: '507f1f77bcf86cd799439011' } as any);
    expect(service.startTask).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
  });
});
