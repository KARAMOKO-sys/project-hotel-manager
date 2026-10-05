import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { MaintenanceRequestService } from './maintenance-request.service';
import { MaintenanceRequest } from '../schemas/maintenance-request.entity';
import { TaskStatus } from '../../base-entities/enums/task-status.enum';

describe('MaintenanceRequestService', () => {
  let service: MaintenanceRequestService;
  let model: any;

  const request = {
    _id: new Types.ObjectId(),
    property_id: new Types.ObjectId(),
    status: TaskStatus.PENDING,
  };

  beforeEach(async () => {
    model = {
      findById: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(request) }),
      findByIdAndUpdate: jest
        .fn()
        .mockReturnValue({
          exec: jest
            .fn()
            .mockResolvedValue({ ...request, status: TaskStatus.COMPLETED }),
        }),
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([request]),
      }),
      countDocuments: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(1) }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaintenanceRequestService,
        { provide: getModelToken(MaintenanceRequest.name), useValue: model },
      ],
    }).compile();

    service = module.get<MaintenanceRequestService>(MaintenanceRequestService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should complete a request', async () => {
    const result = await service.completeRequest(
      request._id.toString(),
      'Fixed',
    );
    expect(result.status).toBe(TaskStatus.COMPLETED);
  });

  it('should list requests by property', async () => {
    const result = await service.getRequestsByProperty(
      request.property_id.toString(),
    );
    expect(result).toEqual([request]);
  });

  it('should list urgent requests', async () => {
    const result = await service.getUrgentRequests(
      request.property_id.toString(),
    );
    expect(result).toEqual([request]);
  });
});
