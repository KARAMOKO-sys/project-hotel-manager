import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { HousekeepingStaffService } from './housekeeping-staff.service';
import {
  HousekeepingStaff,
  HousekeepingStatus,
  ShiftType,
  SpecializationType,
} from '../schemas/housekeeping-staff.entity';
import { CreateHousekeepingStaffDto } from '../dto/create-housekeeping-staff.dto';

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
      updateMany: jest.fn().mockReturnValue(mockQuery({ modifiedCount: 3 })),
      aggregate: jest.fn().mockReturnValue(mockQuery([])),
    },
  );

describe('HousekeepingStaffService', () => {
  let service: HousekeepingStaffService;
  let model: ReturnType<typeof createModelMock>;

  const id = new Types.ObjectId().toString();
  const propertyId = new Types.ObjectId().toString();
  const roomId = new Types.ObjectId().toString();
  const passwordHash = bcrypt.hashSync('OldPassword1', 4);
  const staff: Doc = {
    _id: id,
    email: 'menage@example.com',
    employee_code: 'HK-001',
    property_id: propertyId,
    status: HousekeepingStatus.ACTIVE,
    is_active: true,
    rooms_cleaned_today: 2,
    rooms_cleaned_total: 4,
    total_tasks_completed: 4,
    avg_cleaning_time: 30,
    quality_score: 4,
    total_issue_reports: 1,
    monthly_target: 100,
    monthly_completed: 25,
    attendance_rate: 95,
    cleaning_history: [
      {
        date: new Date(),
        room_id: roomId,
        room_number: '101',
        cleaning_time: 30,
        quality_score: 4,
        issue_reported: false,
      },
      {
        date: new Date('2020-01-01'),
        room_id: roomId,
        room_number: '102',
        cleaning_time: 30,
        quality_score: 4,
        issue_reported: false,
      },
    ],
  };

  beforeEach(async () => {
    model = createModelMock(staff);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HousekeepingStaffService,
        { provide: getModelToken(HousekeepingStaff.name), useValue: model },
      ],
    }).compile();

    service = module.get<HousekeepingStaffService>(HousekeepingStaffService);
  });

  const withDoc = (overrides: Doc) =>
    model.findById.mockReturnValueOnce(mockQuery({ ...staff, ...overrides }));

  const lastUpdate = () => {
    const calls = model.findByIdAndUpdate.mock.calls as Array<[unknown, Doc]>;
    return calls[calls.length - 1][1];
  };

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const dto: CreateHousekeepingStaffDto = {
      email: 'New@Example.com',
      password: 'Secret123!',
      property_id: propertyId,
      employee_code: 'HK-002',
      shift_start: '07:00',
      shift_end: '15:00',
    };

    it('should hash the password and never return the hash', async () => {
      const result = await service.create(dto);
      const [[data]] = model.mock.calls as unknown as Array<[Doc]>;
      await expect(
        bcrypt.compare('Secret123!', data.password_hash as string),
      ).resolves.toBe(true);
      expect(data.email).toBe('new@example.com');
      expect(result).not.toHaveProperty('password_hash');
    });

    it('should reject a duplicate email', async () => {
      model.exists.mockResolvedValueOnce({ _id: id });
      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('should reject identical shift hours', async () => {
      await expect(
        service.create({ ...dto, shift_end: '07:00' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  it('should reject an update with a duplicate employee code', async () => {
    model.exists.mockResolvedValueOnce({ _id: 'other' });
    await expect(
      service.update(id, { employee_code: 'HK-009' }),
    ).rejects.toThrow(ConflictException);
  });

  it('should find by email / employee code or throw NotFound', async () => {
    await expect(service.findByEmail('menage@example.com')).resolves.toBe(
      staff,
    );
    await expect(service.findByEmployeeCode('HK-001')).resolves.toBe(staff);
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
    await expect(service.search('men')).resolves.toEqual([staff]);
    await expect(service.search('')).rejects.toThrow(BadRequestException);
  });

  it('should filter by property and status', async () => {
    await service.findByProperty(
      propertyId,
      { page: 1, limit: 10 },
      HousekeepingStatus.SICK,
    );
    expect(model.find).toHaveBeenCalledWith(
      expect.objectContaining({
        property_id: new Types.ObjectId(propertyId),
        status: HousekeepingStatus.SICK,
      }),
    );
    expect(() => service.findByProperty('bad', { page: 1, limit: 10 })).toThrow(
      BadRequestException,
    );
  });

  it('should filter by specialization', async () => {
    await service.findBySpecialization(SpecializationType.LAUNDRY, {
      page: 1,
      limit: 10,
    });
    expect(model.find).toHaveBeenCalledWith(
      expect.objectContaining({ specialization: SpecializationType.LAUNDRY }),
    );
    expect(() =>
      service.findBySpecialization('bogus' as SpecializationType, {
        page: 1,
        limit: 10,
      }),
    ).toThrow(BadRequestException);
  });

  describe('findAvailable', () => {
    it('should query by working day and shift hours', async () => {
      // Lundi 6 octobre 2025, 10h30 (heure locale)
      const at = new Date(2025, 9, 6, 10, 30);
      await service.findAvailable(propertyId, at);
      expect(model.find).toHaveBeenCalledWith(
        expect.objectContaining({
          working_days: 'monday',
          status: HousekeepingStatus.ACTIVE,
          $or: expect.arrayContaining([
            { shift_start: { $lte: '10:30' }, shift_end: { $gte: '10:30' } },
          ]) as unknown,
        }),
      );
    });

    it('should reject an invalid date', () => {
      expect(() =>
        service.findAvailable(propertyId, new Date('invalid')),
      ).toThrow(BadRequestException);
    });
  });

  it('should activate / deactivate', async () => {
    await expect(service.activate(id)).resolves.toMatchObject({
      status: HousekeepingStatus.ACTIVE,
    });
    await expect(service.deactivate(id)).resolves.toMatchObject({
      status: HousekeepingStatus.INACTIVE,
      is_active: false,
    });
  });

  describe('suspend / reactivate', () => {
    it('should suspend', async () => {
      await expect(service.suspend(id)).resolves.toMatchObject({
        status: HousekeepingStatus.SUSPENDED,
      });
    });

    it('should refuse to suspend twice', async () => {
      withDoc({ status: HousekeepingStatus.SUSPENDED });
      await expect(service.suspend(id)).rejects.toThrow(BadRequestException);
    });

    it('should reactivate a suspended member', async () => {
      withDoc({ status: HousekeepingStatus.SUSPENDED });
      await expect(service.reactivate(id)).resolves.toMatchObject({
        status: HousekeepingStatus.ACTIVE,
      });
    });

    it('should refuse to reactivate an active member', async () => {
      await expect(service.reactivate(id)).rejects.toThrow(BadRequestException);
    });
  });

  it('should set a status and reject an invalid one', async () => {
    await expect(
      service.setStatus(id, HousekeepingStatus.ON_LEAVE),
    ).resolves.toMatchObject({
      status: HousekeepingStatus.ON_LEAVE,
      is_active: true,
    });
    expect(() => service.setStatus(id, 'x' as HousekeepingStatus)).toThrow(
      BadRequestException,
    );
  });

  describe('changePassword', () => {
    beforeEach(() => {
      model.findOne.mockReturnValue(
        mockQuery({ ...staff, password_hash: passwordHash }),
      );
    });

    it('should store a new hash', async () => {
      await service.changePassword(id, 'OldPassword1', 'NewPassword1');
      await expect(
        bcrypt.compare('NewPassword1', lastUpdate().password_hash as string),
      ).resolves.toBe(true);
    });

    it('should reject a wrong current password', async () => {
      await expect(
        service.changePassword(id, 'bad', 'NewPassword1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFound for an unknown member', async () => {
      model.findOne.mockReturnValue(mockQuery(null));
      await expect(
        service.changePassword(id, 'OldPassword1', 'NewPassword1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateSchedule', () => {
    it('should update hours, days and shift type', async () => {
      const result = await service.updateSchedule(id, {
        shift_start: '22:00',
        shift_end: '06:00',
        working_days: ['friday', 'saturday'],
        shift_type: ShiftType.NIGHT,
      });
      expect(result).toMatchObject({
        shift_start: '22:00',
        working_days: ['friday', 'saturday'],
        shift_type: ShiftType.NIGHT,
      });
    });

    it('should reject a malformed hour', () => {
      expect(() =>
        service.updateSchedule(id, { shift_start: '7h', shift_end: '15:00' }),
      ).toThrow(BadRequestException);
    });

    it('should reject an unknown day', () => {
      expect(() =>
        service.updateSchedule(id, {
          shift_start: '07:00',
          shift_end: '15:00',
          working_days: ['funday'],
        }),
      ).toThrow(BadRequestException);
    });
  });

  describe('recordCleaning', () => {
    const record = {
      room_id: roomId,
      room_number: '201',
      cleaning_time: 40,
      quality_score: 5,
      issue_reported: true,
    };

    it('should update counters, averages and history', async () => {
      await service.recordCleaning(id, record);
      const update = lastUpdate();
      expect(update.$set).toEqual({
        avg_cleaning_time: 32,
        quality_score: 4.2,
      });
      expect(update.$inc).toEqual({
        rooms_cleaned_today: 1,
        rooms_cleaned_total: 1,
        total_tasks_completed: 1,
        monthly_completed: 1,
        total_issue_reports: 1,
      });
      expect(update.$push).toHaveProperty('cleaning_history');
    });

    it('should refuse a member on sick leave', async () => {
      withDoc({ status: HousekeepingStatus.SICK });
      await expect(service.recordCleaning(id, record)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject an invalid duration', async () => {
      await expect(
        service.recordCleaning(id, { ...record, cleaning_time: 0 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject an invalid quality score', async () => {
      await expect(
        service.recordCleaning(id, { ...record, quality_score: 7 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject an invalid room id', async () => {
      await expect(
        service.recordCleaning(id, { ...record, room_id: 'bad' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('reportIssue', () => {
    const issue = {
      room_id: roomId,
      room_number: '201',
      issue_type: 'plomberie',
      description: 'Fuite sous le lavabo',
    };

    it('should increment the issue counter', async () => {
      await service.reportIssue(id, issue);
      expect(lastUpdate().$inc).toEqual({ total_issue_reports: 1 });
    });

    it('should reject an empty description', async () => {
      await expect(
        service.reportIssue(id, { ...issue, description: ' ' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFound for an unknown member', async () => {
      model.findById.mockReturnValueOnce(mockQuery(null));
      await expect(service.reportIssue(id, issue)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  it('should set the monthly target and reject a negative one', async () => {
    await expect(service.setMonthlyTarget(id, 120)).resolves.toMatchObject({
      monthly_target: 120,
    });
    expect(() => service.setMonthlyTarget(id, -1)).toThrow(BadRequestException);
  });

  it('should assign a supervisor but not oneself', async () => {
    const supervisorId = new Types.ObjectId().toString();
    await service.assignSupervisor(id, supervisorId, 'Chef');
    expect(lastUpdate()).toEqual({
      supervisor_id: new Types.ObjectId(supervisorId),
      supervisor_name: 'Chef',
    });
    expect(() => service.assignSupervisor(id, id)).toThrow(BadRequestException);
  });

  it('should reset daily and monthly counters for a property', async () => {
    await expect(service.resetDailyCounters(propertyId)).resolves.toEqual({
      modified: 3,
    });
    await expect(service.resetMonthlyCounters(propertyId)).resolves.toEqual({
      modified: 3,
    });
    expect(model.updateMany).toHaveBeenCalledWith(
      { property_id: new Types.ObjectId(propertyId) },
      { $set: { monthly_completed: 0 } },
    );
    await expect(service.resetDailyCounters('bad')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should compute the workload', async () => {
    await expect(service.getWorkload(id)).resolves.toEqual({
      rooms_cleaned_today: 2,
      today_tasks: [{ room_number: '101', time: 30, quality: 4 }],
      monthly_target: 100,
      monthly_completed: 25,
      monthly_remaining: 75,
      monthly_progress: 25,
    });
  });

  it('should compute the performance', async () => {
    await expect(service.getPerformance(id)).resolves.toEqual({
      total_rooms: 4,
      total_tasks: 4,
      avg_cleaning_time: 30,
      quality_score: 4,
      total_issue_reports: 1,
      issue_rate: 25,
      attendance_rate: 95,
      monthly_progress: 25,
    });
  });
});
