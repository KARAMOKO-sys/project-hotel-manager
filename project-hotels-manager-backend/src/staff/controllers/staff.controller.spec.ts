import { Test, TestingModule } from '@nestjs/testing';
import { StaffController } from './staff.controller';
import { StaffService } from '../services/staff.service';
import {
  EmploymentStatus,
  StaffDepartment,
  StaffUserType,
} from '../schemas/staff.entity';
import { CreateStaffDto } from '../dto/create-staff.dto';

describe('StaffController', () => {
  let controller: StaffController;

  const id = '507f1f77bcf86cd799439011';
  const propertyId = '507f1f77bcf86cd799439012';
  const userId = '507f1f77bcf86cd799439013';
  const params = { id };
  const query = { page: 1, limit: 10 };

  const serviceMock = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    restore: jest.fn(),
    findByProperty: jest.fn(),
    getHeadcount: jest.fn(),
    findScheduledOn: jest.fn(),
    findByOrganization: jest.fn(),
    findByUser: jest.fn(),
    getDirectReports: jest.fn(),
    assignManager: jest.fn(),
    updateSchedule: jest.fn(),
    putOnLeave: jest.fn(),
    returnFromLeave: jest.fn(),
    suspend: jest.fn(),
    reactivate: jest.fn(),
    terminate: jest.fn(),
    transfer: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StaffController],
      providers: [{ provide: StaffService, useValue: serviceMock }],
    }).compile();

    controller = module.get<StaffController>(StaffController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  const createDto: CreateStaffDto = {
    user_id: userId,
    user_type: StaffUserType.ACCOUNTANT,
    property_id: propertyId,
    position: 'Comptable',
  };
  const schedule = [{ day: 'monday' as const, start: '08:00', end: '16:00' }];
  const transfer = { property_id: propertyId };

  const cases: Array<[string, () => unknown, jest.Mock, unknown[]]> = [
    [
      'create',
      () => controller.create(createDto),
      serviceMock.create,
      [createDto],
    ],
    ['findAll', () => controller.findAll(query), serviceMock.findAll, [query]],
    [
      'findByProperty',
      () =>
        controller.findByProperty(
          propertyId,
          query,
          StaffDepartment.ACCOUNTING,
          EmploymentStatus.ACTIVE,
        ),
      serviceMock.findByProperty,
      [
        propertyId,
        query,
        {
          department: StaffDepartment.ACCOUNTING,
          status: EmploymentStatus.ACTIVE,
        },
      ],
    ],
    [
      'getHeadcount',
      () => controller.getHeadcount(propertyId),
      serviceMock.getHeadcount,
      [propertyId],
    ],
    [
      'findScheduledOn',
      () => controller.findScheduledOn(propertyId, 'monday'),
      serviceMock.findScheduledOn,
      [propertyId, 'monday'],
    ],
    [
      'findByOrganization',
      () => controller.findByOrganization(propertyId, query),
      serviceMock.findByOrganization,
      [propertyId, query],
    ],
    [
      'findByUser',
      () => controller.findByUser(userId),
      serviceMock.findByUser,
      [userId],
    ],
    ['findOne', () => controller.findOne(params), serviceMock.findOne, [id]],
    [
      'getDirectReports',
      () => controller.getDirectReports(params),
      serviceMock.getDirectReports,
      [id],
    ],
    [
      'update',
      () => controller.update(params, { position: 'Chef comptable' }),
      serviceMock.update,
      [id, { position: 'Chef comptable' }],
    ],
    [
      'assignManager',
      () => controller.assignManager(params, { manager_id: userId }),
      serviceMock.assignManager,
      [id, userId],
    ],
    [
      'updateSchedule',
      () => controller.updateSchedule(params, { schedule }),
      serviceMock.updateSchedule,
      [id, schedule],
    ],
    [
      'putOnLeave',
      () => controller.putOnLeave(params, { reason: 'Congé' }),
      serviceMock.putOnLeave,
      [id, 'Congé'],
    ],
    [
      'returnFromLeave',
      () => controller.returnFromLeave(params),
      serviceMock.returnFromLeave,
      [id],
    ],
    [
      'suspend',
      () => controller.suspend(params, { reason: 'x' }),
      serviceMock.suspend,
      [id, 'x'],
    ],
    [
      'reactivate',
      () => controller.reactivate(params),
      serviceMock.reactivate,
      [id],
    ],
    [
      'terminate',
      () =>
        controller.terminate(params, {
          reason: 'Démission',
          end_date: '2025-06-30',
        }),
      serviceMock.terminate,
      [id, 'Démission', '2025-06-30'],
    ],
    [
      'transfer',
      () => controller.transfer(params, transfer),
      serviceMock.transfer,
      [id, transfer],
    ],
    ['restore', () => controller.restore(params), serviceMock.restore, [id]],
    ['remove', () => controller.remove(params), serviceMock.remove, [id]],
  ];

  it.each(cases)(
    'should delegate %s to the service',
    (_name, invoke, method, args) => {
      method.mockReturnValueOnce('result');
      expect(invoke()).toBe('result');
      expect(method).toHaveBeenCalledWith(...args);
    },
  );
});
