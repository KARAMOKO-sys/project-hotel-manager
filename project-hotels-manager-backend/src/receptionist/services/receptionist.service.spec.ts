import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { ReceptionistService } from './receptionist.service';
import {
  Receptionist,
  ReceptionistShiftType,
  ReceptionistStatus,
} from '../schemas/receptionist.entity';
import { CreateReceptionistDto } from '../dto/create-receptionist.dto';

type Doc = Record<string, unknown>;

/** Simule une requête Mongoose chaînable se résolvant sur `value`. */
const mockQuery = (value: unknown) => {
  const query = {
    sort: jest.fn(),
    skip: jest.fn(),
    limit: jest.fn(),
    lean: jest.fn(),
    select: jest.fn(),
    populate: jest.fn(),
    exec: jest.fn().mockResolvedValue(value),
  };
  query.sort.mockReturnValue(query);
  query.skip.mockReturnValue(query);
  query.limit.mockReturnValue(query);
  query.lean.mockReturnValue(query);
  query.select.mockReturnValue(query);
  query.populate.mockReturnValue(query);
  return query;
};

/** Simule un modèle Mongoose (constructeur + méthodes statiques). */
const createModelMock = (doc: Doc) =>
  Object.assign(
    jest.fn().mockImplementation((data: Doc) => {
      const created: Doc = { _id: new Types.ObjectId(), ...data };
      created.save = jest
        .fn()
        .mockResolvedValue({ ...created, toObject: () => ({ ...created }) });
      return created;
    }),
    {
      findById: jest.fn().mockReturnValue(mockQuery(doc)),
      findOne: jest.fn().mockReturnValue(mockQuery(doc)),
      find: jest.fn().mockReturnValue(mockQuery([doc])),
      findByIdAndUpdate: jest
        .fn()
        .mockImplementation((_id: unknown, update: Doc) =>
          mockQuery({ ...doc, ...update }),
        ),
      countDocuments: jest.fn().mockReturnValue(mockQuery(1)),
      exists: jest.fn().mockResolvedValue(null),
    },
  );

describe('ReceptionistService', () => {
  let service: ReceptionistService;
  let model: ReturnType<typeof createModelMock>;

  const id = new Types.ObjectId().toString();
  const propertyId = new Types.ObjectId().toString();
  const passwordHash = bcrypt.hashSync('OldPassword1', 4);
  const receptionist: Doc = {
    _id: id,
    email: 'reception@example.com',
    employee_code: 'REC-001',
    property_id: propertyId,
    status: ReceptionistStatus.ACTIVE,
    is_active: true,
    can_check_in_out: true,
    can_override_prices: false,
    max_discount_percent: 10,
    reservations_processed: 2,
    total_checkins: 1,
    total_checkouts: 1,
    total_cancellations: 1,
    avg_handling_time: 10,
    shift_schedule: {
      monday: { start: '08:00', end: '16:00' },
      sunday: { start: 'off', end: 'off' },
    },
  };

  beforeEach(async () => {
    model = createModelMock(receptionist);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReceptionistService,
        { provide: getModelToken(Receptionist.name), useValue: model },
      ],
    }).compile();

    service = module.get<ReceptionistService>(ReceptionistService);
  });

  const withDoc = (overrides: Doc) =>
    model.findById.mockReturnValueOnce(
      mockQuery({ ...receptionist, ...overrides }),
    );

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const dto: CreateReceptionistDto = {
      email: 'New@Example.com',
      password: 'Secret123!',
      property_id: propertyId,
      employee_code: 'REC-002',
    };

    it('should hash the password and never return the hash', async () => {
      const result = await service.create(dto);
      const [[data]] = model.mock.calls as unknown as Array<[Doc]>;
      expect(data.email).toBe('new@example.com');
      await expect(
        bcrypt.compare('Secret123!', data.password_hash as string),
      ).resolves.toBe(true);
      expect(result).not.toHaveProperty('password_hash');
    });

    it('should reject a duplicate employee code', async () => {
      model.exists
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ _id: id });
      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('should reject an invalid schedule', async () => {
      await expect(
        service.create({
          ...dto,
          shift_schedule: { monday: { start: '08:00', end: '08:00' } },
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  it('should reject an update with a duplicate email', async () => {
    model.exists.mockResolvedValueOnce({ _id: 'other' });
    await expect(
      service.update(id, { email: 'taken@example.com' }),
    ).rejects.toThrow(ConflictException);
  });

  it('should find by email / employee code or throw NotFound', async () => {
    await expect(service.findByEmail('reception@example.com')).resolves.toBe(
      receptionist,
    );
    await expect(service.findByEmployeeCode('REC-001')).resolves.toBe(
      receptionist,
    );
    model.findOne.mockReturnValueOnce(mockQuery(null));
    await expect(service.findByEmail('x@example.com')).rejects.toThrow(
      NotFoundException,
    );
    model.findOne.mockReturnValueOnce(mockQuery(null));
    await expect(service.findByEmployeeCode('NOPE')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should search and reject an empty term', async () => {
    await expect(service.search('rec')).resolves.toEqual([receptionist]);
    await expect(service.search(' ')).rejects.toThrow(BadRequestException);
  });

  describe('findByProperty', () => {
    it('should filter by property and status', async () => {
      await service.findByProperty(
        propertyId,
        { page: 1, limit: 10 },
        ReceptionistStatus.ON_LEAVE,
      );
      expect(model.find).toHaveBeenCalledWith(
        expect.objectContaining({
          property_id: new Types.ObjectId(propertyId),
          status: ReceptionistStatus.ON_LEAVE,
        }),
      );
    });

    it('should reject an invalid property id', () => {
      expect(() =>
        service.findByProperty('bad', { page: 1, limit: 10 }),
      ).toThrow(BadRequestException);
    });
  });

  it('should list receptionists on duty', async () => {
    await service.findOnDuty(propertyId);
    expect(model.find).toHaveBeenCalledWith(
      expect.objectContaining({
        status: ReceptionistStatus.ACTIVE,
        last_shift_end: null,
        property_id: new Types.ObjectId(propertyId),
      }),
    );
  });

  describe('findScheduledOn', () => {
    it('should query the given day', async () => {
      await service.findScheduledOn(propertyId, 'Monday');
      expect(model.find).toHaveBeenCalledWith(
        expect.objectContaining({
          'shift_schedule.monday.start': { $exists: true, $ne: 'off' },
        }),
      );
    });

    it('should reject an unknown day', () => {
      expect(() => service.findScheduledOn(propertyId, 'funday')).toThrow(
        BadRequestException,
      );
    });
  });

  it('should activate / deactivate', async () => {
    await expect(service.activate(id)).resolves.toMatchObject({
      status: ReceptionistStatus.ACTIVE,
      is_active: true,
    });
    await expect(service.deactivate(id)).resolves.toMatchObject({
      status: ReceptionistStatus.INACTIVE,
      is_active: false,
    });
  });

  describe('suspend / reactivate', () => {
    it('should suspend', async () => {
      await expect(service.suspend(id, 'Retards')).resolves.toMatchObject({
        status: ReceptionistStatus.SUSPENDED,
        is_active: false,
      });
    });

    it('should refuse to suspend twice', async () => {
      withDoc({ status: ReceptionistStatus.SUSPENDED });
      await expect(service.suspend(id)).rejects.toThrow(BadRequestException);
    });

    it('should reactivate a suspended receptionist', async () => {
      withDoc({ status: ReceptionistStatus.SUSPENDED });
      await expect(service.reactivate(id)).resolves.toMatchObject({
        status: ReceptionistStatus.ACTIVE,
      });
    });

    it('should refuse to reactivate an active receptionist', async () => {
      await expect(service.reactivate(id)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFound for an unknown receptionist', async () => {
      model.findById.mockReturnValueOnce(mockQuery(null));
      await expect(service.suspend(id)).rejects.toThrow(NotFoundException);
    });
  });

  describe('setStatus', () => {
    it('should put a receptionist on leave and close the shift', async () => {
      const result = await service.setStatus(id, ReceptionistStatus.ON_LEAVE);
      expect(result.status).toBe(ReceptionistStatus.ON_LEAVE);
      expect(result.is_active).toBe(true);
      expect(result.last_shift_end).toBeInstanceOf(Date);
    });

    it('should reject an invalid status', () => {
      expect(() =>
        service.setStatus(id, 'bogus' as ReceptionistStatus),
      ).toThrow(BadRequestException);
    });
  });

  describe('changePassword', () => {
    beforeEach(() => {
      model.findOne.mockReturnValue(
        mockQuery({ ...receptionist, password_hash: passwordHash }),
      );
    });

    it('should store a new hash', async () => {
      await service.changePassword(id, 'OldPassword1', 'NewPassword1');
      const [, update] = model.findByIdAndUpdate.mock.calls[0] as [
        unknown,
        Doc,
      ];
      await expect(
        bcrypt.compare('NewPassword1', update.password_hash as string),
      ).resolves.toBe(true);
    });

    it('should reject a wrong current password', async () => {
      await expect(
        service.changePassword(id, 'bad', 'NewPassword1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFound for an unknown receptionist', async () => {
      model.findOne.mockReturnValue(mockQuery(null));
      await expect(
        service.changePassword(id, 'OldPassword1', 'NewPassword1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('shifts', () => {
    it('should start a shift', async () => {
      const result = await service.startShift(id);
      expect(result.last_shift_start).toBeInstanceOf(Date);
      expect(result.last_shift_end).toBeNull();
    });

    it('should refuse to start a shift twice', async () => {
      withDoc({ last_shift_start: new Date(), last_shift_end: null });
      await expect(service.startShift(id)).rejects.toThrow(BadRequestException);
    });

    it('should refuse a shift for a receptionist on leave', async () => {
      withDoc({ status: ReceptionistStatus.ON_LEAVE });
      await expect(service.startShift(id)).rejects.toThrow(BadRequestException);
    });

    it('should end a running shift', async () => {
      withDoc({ last_shift_start: new Date(), last_shift_end: null });
      const result = await service.endShift(id);
      expect(result.last_shift_end).toBeInstanceOf(Date);
    });

    it('should refuse to end a shift that is not running', async () => {
      await expect(service.endShift(id)).rejects.toThrow(BadRequestException);
    });
  });

  describe('schedule', () => {
    it('should update the schedule and shift type', async () => {
      const schedule = { tuesday: { start: '22:00', end: '06:00' } };
      const result = await service.updateSchedule(
        id,
        schedule,
        ReceptionistShiftType.NIGHT,
      );
      expect(result.shift_schedule).toEqual(schedule);
      expect(result.shift_type).toBe(ReceptionistShiftType.NIGHT);
    });

    it('should reject a malformed time', () => {
      expect(() =>
        service.updateSchedule(id, {
          monday: { start: '25:00', end: '26:00' },
        }),
      ).toThrow(BadRequestException);
    });

    it('should compute the working days', async () => {
      const result = await service.getSchedule(id);
      expect(result.working_days).toEqual(['monday']);
    });
  });

  describe('recordActivity', () => {
    it('should increment the counter and the average handling time', async () => {
      await service.recordActivity(id, 'checkin', 14);
      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
        id,
        { $inc: { total_checkins: 1 }, avg_handling_time: 10.8 },
        expect.anything(),
      );
    });

    it('should forbid check-ins without permission', async () => {
      withDoc({ can_check_in_out: false });
      await expect(service.recordActivity(id, 'checkout')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should refuse activities for an inactive receptionist', async () => {
      withDoc({ status: ReceptionistStatus.INACTIVE });
      await expect(service.recordActivity(id, 'reservation')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject a negative handling time', async () => {
      await expect(
        service.recordActivity(id, 'reservation', -1),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateSatisfactionScore', () => {
    it('should set the first score', async () => {
      const result = await service.updateSatisfactionScore(id, 4);
      expect(result.satisfaction_score).toBe(4);
    });

    it('should average with the previous score', async () => {
      withDoc({ satisfaction_score: 3 });
      const result = await service.updateSatisfactionScore(id, 5);
      expect(result.satisfaction_score).toBe(4);
    });

    it('should reject an out of range score', async () => {
      await expect(service.updateSatisfactionScore(id, 6)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('checkDiscount', () => {
    it('should allow a discount within the limit', async () => {
      await expect(service.checkDiscount(id, 5)).resolves.toEqual({
        allowed: true,
        max_discount_percent: 10,
      });
    });

    it('should refuse a discount above the limit', async () => {
      const result = await service.checkDiscount(id, 20);
      expect(result.allowed).toBe(false);
    });

    it('should allow any discount with price override', async () => {
      withDoc({ can_override_prices: true });
      const result = await service.checkDiscount(id, 50);
      expect(result.allowed).toBe(true);
    });

    it('should reject an invalid percentage', async () => {
      await expect(service.checkDiscount(id, 150)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  it('should compute performance metrics', async () => {
    await expect(service.getPerformance(id)).resolves.toEqual({
      total_reservations: 2,
      total_checkins: 1,
      total_checkouts: 1,
      total_cancellations: 1,
      total_operations: 4,
      cancellation_rate: 50,
      avg_handling_time: 10,
      satisfaction_score: null,
    });
  });
});
