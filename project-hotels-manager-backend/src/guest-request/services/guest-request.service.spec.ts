import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { GuestRequestService } from './guest-request.service';
import { GuestRequest } from '../schemas/guest-request.entity';
import { TaskStatus } from '../../base-entities/enums/task-status.enum';

describe('GuestRequestService', () => {
  let service: GuestRequestService;
  let model: any;

  const request = {
    _id: new Types.ObjectId(),
    property_id: new Types.ObjectId(),
    guest_id: new Types.ObjectId(),
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
        GuestRequestService,
        { provide: getModelToken(GuestRequest.name), useValue: model },
      ],
    }).compile();

    service = module.get<GuestRequestService>(GuestRequestService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should complete a request', async () => {
    const result = await service.complete(request._id.toString());
    expect(result.status).toBe(TaskStatus.COMPLETED);
  });

  it('should list requests by guest', async () => {
    const result = await service.getRequestsByGuest(
      request.guest_id.toString(),
    );
    expect(result).toEqual([request]);
  });

  it('should list pending requests', async () => {
    const result = await service.getPendingRequests(
      request.property_id.toString(),
    );
    expect(result).toEqual([request]);
  });
});
