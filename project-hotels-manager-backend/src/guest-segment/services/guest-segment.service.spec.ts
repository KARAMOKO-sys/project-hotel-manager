import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { GuestSegmentService } from './guest-segment.service';
import { GuestSegment } from '../schemas/guest-segment.entity';

describe('GuestSegmentService', () => {
  let service: GuestSegmentService;
  let model: any;

  const segment = {
    _id: new Types.ObjectId(),
    property_id: new Types.ObjectId(),
    name: 'VIP',
    member_count: 10,
    is_active: true,
    criteria: { loyalty_tier: 'gold' },
  };

  beforeEach(async () => {
    model = {
      findById: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(segment) }),
      findByIdAndUpdate: jest
        .fn()
        .mockReturnValue({
          exec: jest.fn().mockResolvedValue({ ...segment, is_active: false }),
        }),
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([segment]),
      }),
      countDocuments: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(1) }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GuestSegmentService,
        { provide: getModelToken(GuestSegment.name), useValue: model },
      ],
    }).compile();

    service = module.get<GuestSegmentService>(GuestSegmentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should deactivate a segment', async () => {
    const result = await service.deactivate(segment._id.toString());
    expect(result.is_active).toBe(false);
  });

  it('should return segment statistics', async () => {
    const result = await service.getStatistics(segment._id.toString());
    expect(result.member_count).toBe(10);
  });
});
