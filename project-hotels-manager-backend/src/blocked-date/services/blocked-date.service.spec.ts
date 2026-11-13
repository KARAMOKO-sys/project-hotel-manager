/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return -- mocks Mongoose typés `any` */
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { BlockedDateService } from './blocked-date.service';
import { BlockedDate, BlockReason } from '../schemas/blocked-date.entity';

const execOf = (value: unknown) => ({
  exec: jest.fn().mockResolvedValue(value),
});

describe('BlockedDateService', () => {
  let service: BlockedDateService;
  let model: any;

  const propertyId = new Types.ObjectId();
  const roomId = new Types.ObjectId();
  const roomTypeId = new Types.ObjectId();

  const block = {
    _id: new Types.ObjectId(),
    property_id: propertyId,
    room_id: roomId,
    start_date: new Date('2026-11-01T00:00:00.000Z'),
    end_date: new Date('2026-11-05T23:59:59.999Z'),
    reason: BlockReason.MAINTENANCE,
    is_active: true,
  };

  let findChain: any;

  beforeEach(async () => {
    const ModelMock: any = function (data: any) {
      const doc = { _id: new Types.ObjectId(), ...data };
      doc.save = jest.fn().mockResolvedValue(doc);
      return doc;
    };
    ModelMock.findById = jest.fn().mockReturnValue(execOf(block));
    ModelMock.findOne = jest.fn().mockReturnValue(execOf(null));
    ModelMock.findByIdAndUpdate = jest
      .fn()
      .mockImplementation((id: string, data: any) =>
        execOf({ ...block, ...data }),
      );
    ModelMock.countDocuments = jest.fn().mockReturnValue(execOf(0));
    findChain = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([block]),
    };
    ModelMock.find = jest.fn().mockReturnValue(findChain);
    model = ModelMock;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlockedDateService,
        { provide: getModelToken(BlockedDate.name), useValue: model },
      ],
    }).compile();

    service = module.get<BlockedDateService>(BlockedDateService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create (blockDates)', () => {
    it('should block a room over full UTC days', async () => {
      const result = await service.create({
        property_id: propertyId.toString(),
        room_id: roomId.toString(),
        start_date: '2026-11-01',
        end_date: '2026-11-05',
        reason: BlockReason.MAINTENANCE,
      });

      expect(result.start_date.toISOString()).toBe('2026-11-01T00:00:00.000Z');
      expect(result.end_date.toISOString()).toBe('2026-11-05T23:59:59.999Z');
      expect(result.is_active).toBe(true);
      const filter = model.findOne.mock.calls[0][0];
      expect(filter.is_active).toBe(true);
      expect(filter.$or).toHaveLength(2);
    });

    it('should accept a single-day block (start = end)', async () => {
      await expect(
        service.create({
          property_id: propertyId.toString(),
          room_type_id: roomTypeId.toString(),
          start_date: '2026-11-01',
          end_date: '2026-11-01',
        }),
      ).resolves.toBeDefined();
    });

    it('should reject an end date before the start date', async () => {
      await expect(
        service.create({
          property_id: propertyId.toString(),
          start_date: '2026-11-05',
          end_date: '2026-11-01',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(model.findOne).not.toHaveBeenCalled();
    });

    it('should reject an invalid date', async () => {
      await expect(
        service.create({
          property_id: propertyId.toString(),
          start_date: 'not-a-date',
          end_date: '2026-11-01',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should reject an invalid property id', async () => {
      await expect(
        service.create({
          property_id: 'bad-id',
          start_date: '2026-11-01',
          end_date: '2026-11-02',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should reject a block overlapping an active block', async () => {
      model.findOne.mockReturnValue(execOf(block));
      await expect(
        service.create({
          property_id: propertyId.toString(),
          room_id: roomId.toString(),
          start_date: '2026-11-03',
          end_date: '2026-11-08',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('should only check property-wide blocks for a property-wide block', async () => {
      await service.create({
        property_id: propertyId.toString(),
        start_date: '2026-11-01',
        end_date: '2026-11-02',
      });
      const filter = model.findOne.mock.calls[0][0];
      expect(filter.room_id).toBeNull();
      expect(filter.room_type_id).toBeNull();
    });
  });

  describe('update', () => {
    it('should revalidate overlap excluding the block itself', async () => {
      const result = await service.update(block._id.toString(), {
        end_date: '2026-11-10',
      });
      const filter = model.findOne.mock.calls[0][0];
      expect(filter._id).toEqual({ $ne: block._id });
      expect(result.end_date.toISOString()).toBe('2026-11-10T23:59:59.999Z');
    });

    it('should reject an end date before the existing start date', async () => {
      await expect(
        service.update(block._id.toString(), { end_date: '2026-10-01' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should reject an overlapping update', async () => {
      model.findOne.mockReturnValue(
        execOf({ ...block, _id: new Types.ObjectId() }),
      );
      await expect(
        service.update(block._id.toString(), { start_date: '2026-10-28' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('should throw NotFound for an unknown block', async () => {
      model.findById.mockReturnValue(execOf(null));
      await expect(
        service.update(new Types.ObjectId().toString(), {}),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('unblock', () => {
    it('should deactivate an active block', async () => {
      const result = await service.unblock(block._id.toString());
      expect(result.is_active).toBe(false);
      expect(result.unblocked_at).toBeInstanceOf(Date);
    });

    it('should reject an already unblocked period', async () => {
      model.findById.mockReturnValue(execOf({ ...block, is_active: false }));
      await expect(
        service.unblock(block._id.toString()),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should throw NotFound for an unknown block', async () => {
      model.findById.mockReturnValue(execOf(null));
      await expect(
        service.unblock(new Types.ObjectId().toString()),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('getBlockedDates', () => {
    it('should list active blocks overlapping the range', async () => {
      const result = await service.getBlockedDates(
        propertyId.toString(),
        '2026-11-01',
        '2026-11-30',
        { roomId: roomId.toString() },
      );
      expect(result).toEqual([block]);
      const filter = model.find.mock.calls[0][0];
      expect(filter.room_id).toEqual(roomId);
      expect(filter.start_date.$lte.toISOString()).toBe(
        '2026-11-30T23:59:59.999Z',
      );
      expect(findChain.sort).toHaveBeenCalledWith({ start_date: 1 });
    });

    it('should reject an inverted range', async () => {
      await expect(
        service.getBlockedDates(
          propertyId.toString(),
          '2026-11-30',
          '2026-11-01',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('isBlocked', () => {
    it('should return true when an overlapping block exists', async () => {
      model.countDocuments.mockReturnValue(execOf(1));
      await expect(
        service.isBlocked(propertyId.toString(), '2026-11-02', '2026-11-03', {
          roomId: roomId.toString(),
          roomTypeId: roomTypeId.toString(),
        }),
      ).resolves.toBe(true);
      const filter = model.countDocuments.mock.calls[0][0];
      expect(filter.$or).toHaveLength(3);
    });

    it('should return false when nothing is blocked', async () => {
      await expect(
        service.isBlocked(propertyId.toString(), '2026-12-01', '2026-12-03', {
          roomTypeId: roomTypeId.toString(),
        }),
      ).resolves.toBe(false);
    });
  });

  it('should list blocks of a room (paginated)', async () => {
    const result = await service.findByRoom(roomId.toString(), {
      page: 1,
      limit: 10,
    });
    expect(result.data).toEqual([block]);
    expect(model.find.mock.calls[0][0].room_id).toEqual(roomId);
  });

  it('should reject an invalid room id', () => {
    expect(() => service.findByRoom('bad', { page: 1, limit: 10 })).toThrow(
      BadRequestException,
    );
  });
});
