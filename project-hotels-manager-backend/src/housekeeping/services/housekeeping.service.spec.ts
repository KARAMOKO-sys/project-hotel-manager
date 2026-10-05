import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { HousekeepingService } from './housekeeping.service';
import { Housekeeping } from '../schemas/housekeeping.entity';
import { TaskStatus } from '../../base-entities/enums/task-status.enum';

describe('HousekeepingService', () => {
  let service: HousekeepingService;
  let model: any;

  const task = {
    _id: new Types.ObjectId(),
    property_id: new Types.ObjectId(),
    room_id: new Types.ObjectId(),
    status: TaskStatus.PENDING,
  };

  beforeEach(async () => {
    model = {
      findById: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(task) }),
      findByIdAndUpdate: jest
        .fn()
        .mockReturnValue({
          exec: jest
            .fn()
            .mockResolvedValue({ ...task, status: TaskStatus.IN_PROGRESS }),
        }),
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([task]),
      }),
      countDocuments: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(1) }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HousekeepingService,
        { provide: getModelToken(Housekeeping.name), useValue: model },
      ],
    }).compile();

    service = module.get<HousekeepingService>(HousekeepingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should assign a task', async () => {
    await service.assignTask(task._id.toString(), '507f1f77bcf86cd799439011');
    expect(model.findByIdAndUpdate).toHaveBeenCalled();
  });

  it('should start a task', async () => {
    const result = await service.startTask(task._id.toString());
    expect(result.status).toBe(TaskStatus.IN_PROGRESS);
  });

  it('should list pending tasks', async () => {
    const result = await service.getPendingTasks(task.property_id.toString());
    expect(result).toEqual([task]);
  });
});
