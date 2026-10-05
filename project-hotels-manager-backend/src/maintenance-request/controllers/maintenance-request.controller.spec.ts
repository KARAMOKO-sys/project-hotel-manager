import { Test, TestingModule } from '@nestjs/testing';
import { MaintenanceRequestController } from './maintenance-request.controller';
import { MaintenanceRequestService } from '../services/maintenance-request.service';

describe('MaintenanceRequestController', () => {
  let controller: MaintenanceRequestController;
  let service: MaintenanceRequestService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MaintenanceRequestController],
      providers: [
        {
          provide: MaintenanceRequestService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            assignRequest: jest.fn(),
            startRequest: jest.fn(),
            completeRequest: jest.fn(),
            cancelRequest: jest.fn(),
            getRequestsByProperty: jest.fn(),
            getUrgentRequests: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<MaintenanceRequestController>(
      MaintenanceRequestController,
    );
    service = module.get<MaintenanceRequestService>(MaintenanceRequestService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate completeRequest to the service', () => {
    controller.completeRequest({ id: '507f1f77bcf86cd799439011' } as any, {
      resolution: 'Fixed',
    });
    expect(service.completeRequest).toHaveBeenCalled();
  });
});
