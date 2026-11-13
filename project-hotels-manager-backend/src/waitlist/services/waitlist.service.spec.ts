/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return -- mocks Mongoose typés `any` */
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { WaitlistService } from './waitlist.service';
import { Waitlist, WaitlistStatus } from '../schemas/waitlist.entity';
import { LoyaltyTier } from '../../base-entities/enums/loyalty-tier.enum';

const DAY = 24 * 60 * 60 * 1000;
const execOf = (value: unknown) => ({
  exec: jest.fn().mockResolvedValue(value),
});
/** Date (YYYY-MM-DD) relative à aujourd'hui, pour rester dans le futur. */
const inDays = (days: number) =>
  new Date(Date.now() + days * DAY).toISOString().slice(0, 10);

describe('WaitlistService', () => {
  let service: WaitlistService;
  let model: any;
  let findChain: any;

  const propertyId = new Types.ObjectId();
  const guestId = new Types.ObjectId();
  const roomTypeId = new Types.ObjectId();

  const makeEntry = (overrides: Record<string, unknown> = {}) => ({
    _id: new Types.ObjectId(),
    property_id: propertyId,
    guest_id: guestId,
    room_type_id: roomTypeId,
    check_in: new Date(`${inDays(10)}T00:00:00.000Z`),
    check_out: new Date(`${inDays(12)}T00:00:00.000Z`),
    status: WaitlistStatus.WAITING,
    loyalty_tier: LoyaltyTier.GOLD,
    priority: 25,
    preferences: { date_flexibility_days: 0, alternative_room_type_ids: [] },
    created_at: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  });

  let entry: ReturnType<typeof makeEntry>;

  beforeEach(async () => {
    entry = makeEntry();
    const ModelMock: any = function (data: any) {
      const doc = { _id: new Types.ObjectId(), ...data };
      doc.save = jest.fn().mockResolvedValue(doc);
      return doc;
    };
    ModelMock.findById = jest.fn().mockImplementation(() => execOf(entry));
    ModelMock.findOne = jest.fn().mockReturnValue(execOf(null));
    ModelMock.findByIdAndUpdate = jest
      .fn()
      .mockImplementation((id: string, data: any) =>
        execOf({ ...entry, ...data }),
      );
    ModelMock.findOneAndUpdate = jest
      .fn()
      .mockImplementation((filter: any, update: any) =>
        execOf({ ...entry, _id: filter._id, ...update.$set }),
      );
    ModelMock.countDocuments = jest.fn().mockReturnValue(execOf(0));
    ModelMock.updateMany = jest
      .fn()
      .mockReturnValue(execOf({ modifiedCount: 3 }));
    ModelMock.aggregate = jest.fn().mockReturnValue(execOf([]));
    findChain = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([entry]),
    };
    ModelMock.find = jest.fn().mockReturnValue(findChain);
    model = ModelMock;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WaitlistService,
        { provide: getModelToken(Waitlist.name), useValue: model },
      ],
    }).compile();

    service = module.get<WaitlistService>(WaitlistService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create (addToWaitlist)', () => {
    const dto = () => ({
      property_id: propertyId.toString(),
      guest_id: guestId.toString(),
      room_type_id: roomTypeId.toString(),
      check_in: inDays(10),
      check_out: inDays(12),
    });

    it('should add a guest with loyalty-based priority', async () => {
      const result = await service.create({
        ...dto(),
        loyalty_tier: LoyaltyTier.PLATINUM,
        priority_boost: 5,
      });
      expect(result.status).toBe(WaitlistStatus.WAITING);
      expect(result.priority).toBe(35);
      expect((result as any).priority_boost).toBeUndefined();
    });

    it('should default to bronze tier with zero priority', async () => {
      const result = await service.create(dto());
      expect(result.loyalty_tier).toBe(LoyaltyTier.BRONZE);
      expect(result.priority).toBe(0);
    });

    it('should reject a check-out before check-in', async () => {
      await expect(
        service.create({
          ...dto(),
          check_in: inDays(12),
          check_out: inDays(10),
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should reject a check-in in the past', async () => {
      await expect(
        service.create({
          ...dto(),
          check_in: inDays(-3),
          check_out: inDays(2),
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should reject a duplicate active entry for the same stay', async () => {
      model.findOne.mockReturnValue(execOf(entry));
      await expect(service.create(dto())).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('should reject an invalid guest id', async () => {
      await expect(
        service.create({ ...dto(), guest_id: 'oops' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('update', () => {
    it('should recompute priority keeping the existing manual boost', async () => {
      const result = await service.update(entry._id.toString(), {
        loyalty_tier: LoyaltyTier.PLATINUM,
      });
      // GOLD (20) + boost 5 -> PLATINUM (30) + boost 5
      expect(result.priority).toBe(35);
    });

    it('should refuse to update a non waiting entry', async () => {
      entry = makeEntry({ status: WaitlistStatus.NOTIFIED });
      await expect(
        service.update(entry._id.toString(), { adults: 2 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should reject invalid merged dates', async () => {
      await expect(
        service.update(entry._id.toString(), { check_out: inDays(5) }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('getPosition', () => {
    it('should compute the position from higher priority / older entries', async () => {
      model.countDocuments
        .mockReturnValueOnce(execOf(2))
        .mockReturnValueOnce(execOf(7));
      const result = await service.getPosition(entry._id.toString());
      expect(result).toEqual({
        id: entry._id.toString(),
        position: 3,
        total_waiting: 7,
      });
      const aheadFilter = model.countDocuments.mock.calls[0][0];
      expect(aheadFilter.$or[0]).toEqual({ priority: { $gt: 25 } });
    });

    it('should reject when the entry is no longer waiting', async () => {
      entry = makeEntry({ status: WaitlistStatus.CONVERTED });
      await expect(
        service.getPosition(entry._id.toString()),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should throw NotFound for an unknown entry', async () => {
      model.findById.mockImplementation(() => execOf(null));
      await expect(
        service.getPosition(new Types.ObjectId().toString()),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('findMatchingEntries', () => {
    it('should keep entries whose stay fits in the availability', async () => {
      const result = await service.findMatchingEntries(
        propertyId.toString(),
        `${inDays(9)}T00:00:00.000Z`,
        `${inDays(13)}T00:00:00.000Z`,
        roomTypeId.toString(),
      );
      expect(result).toHaveLength(1);
      const filter = model.find.mock.calls[0][0];
      expect(filter.$or).toHaveLength(3);
      expect(findChain.sort).toHaveBeenCalledWith({
        priority: -1,
        created_at: 1,
      });
    });

    it('should drop entries that do not fit without flexibility', async () => {
      const result = await service.findMatchingEntries(
        propertyId.toString(),
        `${inDays(11)}T00:00:00.000Z`,
        `${inDays(14)}T00:00:00.000Z`,
      );
      expect(result).toHaveLength(0);
    });

    it('should accept shifted dates within the guest flexibility', async () => {
      findChain.exec.mockResolvedValue([
        makeEntry({
          preferences: { date_flexibility_days: 2 },
        }),
      ]);
      const result = await service.findMatchingEntries(
        propertyId.toString(),
        `${inDays(11)}T00:00:00.000Z`,
        `${inDays(14)}T00:00:00.000Z`,
      );
      expect(result).toHaveLength(1);
    });

    it('should reject an inverted availability range', async () => {
      await expect(
        service.findMatchingEntries(
          propertyId.toString(),
          inDays(14),
          inDays(11),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('notifyAvailable', () => {
    it('should notify the best candidates with a 4h deadline', async () => {
      const second = makeEntry({ priority: 0 });
      findChain.exec.mockResolvedValue([entry, second]);
      const now = new Date('2026-10-06T10:00:00.000Z');

      const result = await service.notifyAvailable(
        propertyId.toString(),
        { start_date: inDays(9), end_date: inDays(13), limit: 1 },
        now,
      );

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(WaitlistStatus.NOTIFIED);
      expect(result[0].confirmation_deadline?.toISOString()).toBe(
        '2026-10-06T14:00:00.000Z',
      );
      const [filter, update] = model.findOneAndUpdate.mock.calls[0];
      expect(filter).toEqual({
        _id: entry._id,
        status: WaitlistStatus.WAITING,
      });
      expect(update.$inc).toEqual({ notification_count: 1 });
    });

    it('should skip entries already taken concurrently', async () => {
      model.findOneAndUpdate.mockReturnValue(execOf(null));
      const result = await service.notifyAvailable(propertyId.toString(), {
        start_date: inDays(9),
        end_date: inDays(13),
      });
      expect(result).toEqual([]);
    });
  });

  describe('confirm', () => {
    it('should confirm within the deadline', async () => {
      entry = makeEntry({
        status: WaitlistStatus.NOTIFIED,
        confirmation_deadline: new Date('2026-10-06T14:00:00.000Z'),
      });
      const result = await service.confirm(
        entry._id.toString(),
        new Date('2026-10-06T13:59:00.000Z'),
      );
      expect(result.status).toBe(WaitlistStatus.CONFIRMED);
    });

    it('should expire and reject after the 4h deadline', async () => {
      entry = makeEntry({
        status: WaitlistStatus.NOTIFIED,
        confirmation_deadline: new Date('2026-10-06T14:00:00.000Z'),
      });
      await expect(
        service.confirm(
          entry._id.toString(),
          new Date('2026-10-06T14:01:00.000Z'),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(model.findByIdAndUpdate.mock.calls[0][1]).toEqual({
        status: WaitlistStatus.EXPIRED,
      });
    });

    it('should reject a confirmation without notification', async () => {
      await expect(
        service.confirm(entry._id.toString()),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('convertToReservation', () => {
    it('should link a confirmed entry to a reservation', async () => {
      entry = makeEntry({ status: WaitlistStatus.CONFIRMED });
      const reservationId = new Types.ObjectId();
      const result = await service.convertToReservation(
        entry._id.toString(),
        reservationId.toString(),
      );
      expect(result.status).toBe(WaitlistStatus.CONVERTED);
      expect(result.reservation_id).toEqual(reservationId);
    });

    it('should refuse to convert a waiting entry', async () => {
      await expect(
        service.convertToReservation(
          entry._id.toString(),
          new Types.ObjectId().toString(),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('cancel', () => {
    it('should cancel an active entry with a reason', async () => {
      const result = await service.cancel(
        entry._id.toString(),
        'Plans changed',
      );
      expect(result.status).toBe(WaitlistStatus.CANCELLED);
      expect(result.cancellation_reason).toBe('Plans changed');
    });

    it('should refuse to cancel a closed entry', async () => {
      entry = makeEntry({ status: WaitlistStatus.EXPIRED });
      await expect(service.cancel(entry._id.toString())).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  it('should expire overdue notified entries', async () => {
    const now = new Date();
    await expect(service.expireOverdue(now)).resolves.toEqual({ expired: 3 });
    const filter = model.updateMany.mock.calls[0][0];
    expect(filter.confirmation_deadline).toEqual({ $lt: now });
  });

  describe('getStatistics', () => {
    it('should compute sizes and conversion rate', async () => {
      model.aggregate.mockReturnValue(
        execOf([
          { _id: WaitlistStatus.WAITING, count: 4 },
          { _id: WaitlistStatus.NOTIFIED, count: 1 },
          { _id: WaitlistStatus.CONVERTED, count: 3 },
          { _id: WaitlistStatus.EXPIRED, count: 2 },
        ]),
      );
      const stats = await service.getStatistics(propertyId.toString());
      expect(stats.total).toBe(10);
      expect(stats.current_size).toBe(5);
      expect(stats.conversion_rate).toBe(30);
      expect(stats.expiration_rate).toBe(20);
      expect(stats.by_status[WaitlistStatus.CANCELLED]).toBe(0);
    });

    it('should return zero rates for an empty waitlist', async () => {
      const stats = await service.getStatistics(propertyId.toString());
      expect(stats.total).toBe(0);
      expect(stats.conversion_rate).toBe(0);
    });
  });

  it('should list a property queue filtered by status', async () => {
    const result = await service.findByProperty(
      propertyId.toString(),
      { page: 1, limit: 10 },
      WaitlistStatus.WAITING,
    );
    expect(result.data).toEqual([entry]);
    expect(model.find.mock.calls[0][0].status).toBe(WaitlistStatus.WAITING);
    expect(findChain.sort).toHaveBeenCalledWith('-priority created_at');
  });
});
