import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { StaffService } from './staff.service';
import {
  EmploymentStatus,
  Staff,
  StaffDepartment,
  StaffUserType,
} from '../schemas/staff.entity';
import { CreateStaffDto } from '../dto/create-staff.dto';

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

describe('StaffService', () => {
  let service: StaffService;
  let model: ReturnType<typeof createModelMock>;

  const id = new Types.ObjectId().toString();
  const userId = new Types.ObjectId();
  const propertyId = new Types.ObjectId();
  const otherPropertyId = new Types.ObjectId().toString();
  const staff: Doc = {
    _id: id,
    user_id: userId,
    user_type: StaffUserType.RECEPTIONIST,
    property_id: propertyId,
    employee_code: 'EMP-001',
    position: 'Réceptionniste',
    department: StaffDepartment.FRONT_OFFICE,
    employment_status: EmploymentStatus.ACTIVE,
    hire_date: new Date('2024-01-15'),
    schedule: [],
    weekly_hours: 0,
  };

  beforeEach(async () => {
    model = createModelMock(staff);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StaffService,
        { provide: getModelToken(Staff.name), useValue: model },
      ],
    }).compile();

    service = module.get<StaffService>(StaffService);
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
    const dto: CreateStaffDto = {
      user_id: userId.toString(),
      user_type: StaffUserType.HOUSEKEEPING,
      property_id: propertyId.toString(),
      position: 'Femme de chambre',
      employee_code: 'EMP-002',
      hire_date: '2025-03-01',
      schedule: [
        { day: 'monday', start: '08:00', end: '16:00' },
        { day: 'friday', start: '22:00', end: '06:00' },
      ],
    };

    it('should create an active assignment and compute weekly hours', async () => {
      const result = await service.create(dto);
      const [[data]] = model.mock.calls as unknown as Array<[Doc]>;
      expect(data.user_id).toEqual(userId);
      expect(data.property_id).toEqual(propertyId);
      expect(data.employment_status).toBe(EmploymentStatus.ACTIVE);
      expect(data.weekly_hours).toBe(16);
      expect(result).toMatchObject({ position: 'Femme de chambre' });
    });

    it('should refuse a second current assignment', async () => {
      model.exists.mockResolvedValueOnce({ _id: id });
      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('should refuse a duplicate employee code', async () => {
      model.exists
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ _id: id });
      await expect(service.create(dto)).rejects.toThrow(/matricule/);
    });

    it('should refuse an end date before the hire date', async () => {
      await expect(
        service.create({ ...dto, end_date: '2024-01-01' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should refuse two shifts on the same day', async () => {
      await expect(
        service.create({
          ...dto,
          schedule: [
            { day: 'monday', start: '08:00', end: '12:00' },
            { day: 'monday', start: '14:00', end: '18:00' },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should refuse an invalid user id', async () => {
      await expect(service.create({ ...dto, user_id: 'bad' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('update', () => {
    it('should recompute weekly hours with the schedule', async () => {
      await service.update(id, {
        schedule: [{ day: 'tuesday', start: '09:00', end: '17:30' }],
      });
      expect(lastUpdate().weekly_hours).toBe(8.5);
    });

    it('should refuse a duplicate employee code', async () => {
      model.exists.mockResolvedValueOnce({ _id: 'other' });
      await expect(
        service.update(id, { employee_code: 'EMP-009' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should refuse an end date before the hire date', async () => {
      await expect(
        service.update(id, { end_date: '2023-01-01' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  it('should apply the search filter in findAll', async () => {
    await service.findAll({ page: 1, limit: 10, search: 'récep' });
    expect(model.find).toHaveBeenCalledWith(
      expect.objectContaining({ $or: expect.any(Array) as unknown }),
    );
  });

  describe('findByProperty', () => {
    it('should filter by department and status', async () => {
      await service.findByProperty(
        propertyId.toString(),
        { page: 1, limit: 10 },
        {
          department: StaffDepartment.HOUSEKEEPING,
          status: EmploymentStatus.ON_LEAVE,
        },
      );
      expect(model.find).toHaveBeenCalledWith(
        expect.objectContaining({
          property_id: propertyId,
          department: StaffDepartment.HOUSEKEEPING,
          employment_status: EmploymentStatus.ON_LEAVE,
        }),
      );
    });

    it('should reject invalid filters', () => {
      expect(() =>
        service.findByProperty(
          propertyId.toString(),
          { page: 1, limit: 10 },
          { department: 'x' as StaffDepartment },
        ),
      ).toThrow(BadRequestException);
      expect(() =>
        service.findByProperty('bad', { page: 1, limit: 10 }),
      ).toThrow(BadRequestException);
    });
  });

  it('should list by organization and by user', async () => {
    const organizationId = new Types.ObjectId();
    await service.findByOrganization(organizationId.toString(), {
      page: 1,
      limit: 10,
    });
    expect(model.find).toHaveBeenCalledWith(
      expect.objectContaining({ organization_id: organizationId }),
    );
    await expect(service.findByUser(userId.toString())).resolves.toEqual([
      staff,
    ]);
  });

  it('should list direct reports or throw NotFound', async () => {
    await expect(service.getDirectReports(id)).resolves.toEqual([staff]);
    model.findById.mockReturnValueOnce(mockQuery(null));
    await expect(service.getDirectReports(id)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should list staff scheduled on a day', async () => {
    await service.findScheduledOn(propertyId.toString(), 'Friday');
    expect(model.find).toHaveBeenCalledWith(
      expect.objectContaining({ 'schedule.day': 'friday' }),
    );
    expect(() =>
      service.findScheduledOn(propertyId.toString(), 'someday'),
    ).toThrow(BadRequestException);
  });

  describe('assignManager', () => {
    const managerId = new Types.ObjectId().toString();

    it('should assign a manager from the same property', async () => {
      await service.assignManager(id, managerId);
      expect(lastUpdate()).toEqual({
        manager_id: new Types.ObjectId(managerId),
      });
    });

    it('should refuse oneself as manager', async () => {
      await expect(service.assignManager(id, id)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should refuse a manager from another property', async () => {
      model.findById
        .mockReturnValueOnce(mockQuery(staff))
        .mockReturnValueOnce(
          mockQuery({ ...staff, property_id: otherPropertyId }),
        );
      await expect(service.assignManager(id, managerId)).rejects.toThrow(
        /même propriété/,
      );
    });

    it('should refuse a circular assignment', async () => {
      model.findById
        .mockReturnValueOnce(mockQuery(staff))
        .mockReturnValueOnce(mockQuery({ ...staff, manager_id: id }));
      await expect(service.assignManager(id, managerId)).rejects.toThrow(
        /circulaire/,
      );
    });

    it('should throw NotFound for an unknown manager', async () => {
      model.findById
        .mockReturnValueOnce(mockQuery(staff))
        .mockReturnValueOnce(mockQuery(null));
      await expect(service.assignManager(id, managerId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  it('should update the schedule and reject an invalid one', async () => {
    const result = await service.updateSchedule(id, [
      { day: 'saturday', start: '10:00', end: '14:00' },
    ]);
    expect(result.weekly_hours).toBe(4);
    expect(() =>
      service.updateSchedule(id, [
        { day: 'saturday', start: '10:00', end: '10:00' },
      ]),
    ).toThrow(BadRequestException);
  });

  describe('status transitions', () => {
    it('should put an active employee on leave', async () => {
      const result = await service.putOnLeave(id, 'Congé annuel');
      expect(result.employment_status).toBe(EmploymentStatus.ON_LEAVE);
      expect(result.status_reason).toBe('Congé annuel');
    });

    it('should return from leave', async () => {
      withDoc({ employment_status: EmploymentStatus.ON_LEAVE });
      await expect(service.returnFromLeave(id)).resolves.toMatchObject({
        employment_status: EmploymentStatus.ACTIVE,
      });
    });

    it('should refuse to return from leave when active', async () => {
      await expect(service.returnFromLeave(id)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should suspend and reactivate', async () => {
      await expect(service.suspend(id, 'Enquête')).resolves.toMatchObject({
        employment_status: EmploymentStatus.SUSPENDED,
      });
      withDoc({ employment_status: EmploymentStatus.SUSPENDED });
      await expect(service.reactivate(id)).resolves.toMatchObject({
        employment_status: EmploymentStatus.ACTIVE,
      });
    });

    it('should refuse to suspend a terminated employee', async () => {
      withDoc({ employment_status: EmploymentStatus.TERMINATED });
      await expect(service.suspend(id)).rejects.toThrow(BadRequestException);
    });
  });

  describe('terminate', () => {
    it('should terminate a contract', async () => {
      const result = await service.terminate(id, 'Démission', '2025-06-30');
      expect(result.employment_status).toBe(EmploymentStatus.TERMINATED);
      expect(result.end_date).toEqual(new Date('2025-06-30'));
    });

    it('should require a reason', async () => {
      await expect(service.terminate(id, '')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should refuse an end date before the hire date', async () => {
      await expect(
        service.terminate(id, 'Démission', '2020-01-01'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should refuse to terminate twice', async () => {
      withDoc({ employment_status: EmploymentStatus.TERMINATED });
      await expect(service.terminate(id, 'Démission')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('transfer', () => {
    it('should move the employee and clear the manager', async () => {
      await service.transfer(id, {
        property_id: otherPropertyId,
        department: StaffDepartment.MANAGEMENT,
      });
      expect(lastUpdate()).toMatchObject({
        property_id: new Types.ObjectId(otherPropertyId),
        manager_id: null,
        department: StaffDepartment.MANAGEMENT,
      });
    });

    it('should refuse a transfer to the same property', async () => {
      await expect(
        service.transfer(id, { property_id: propertyId.toString() }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should refuse when the user already works at the target', async () => {
      model.exists.mockResolvedValueOnce({ _id: 'other' });
      await expect(
        service.transfer(id, { property_id: otherPropertyId }),
      ).rejects.toThrow(ConflictException);
    });

    it('should refuse a terminated employee', async () => {
      withDoc({ employment_status: EmploymentStatus.TERMINATED });
      await expect(
        service.transfer(id, { property_id: otherPropertyId }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  it('should compute the headcount', async () => {
    model.aggregate.mockReturnValueOnce(
      mockQuery([
        {
          by_department: [
            { _id: 'front_office', count: 2 },
            { _id: 'housekeeping', count: 3 },
          ],
          by_status: [
            { _id: 'active', count: 4 },
            { _id: 'on_leave', count: 1 },
            { _id: 'terminated', count: 2 },
          ],
        },
      ]),
    );
    await expect(service.getHeadcount(propertyId.toString())).resolves.toEqual({
      total: 5,
      active: 4,
      by_department: { front_office: 2, housekeeping: 3 },
      by_status: { active: 4, on_leave: 1, terminated: 2 },
    });
  });
});
