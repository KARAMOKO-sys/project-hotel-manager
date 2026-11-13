import { Test, TestingModule } from '@nestjs/testing';
import { HousekeepingStaffController } from './housekeeping-staff.controller';
import { HousekeepingStaffService } from '../services/housekeeping-staff.service';
import {
  HousekeepingStatus,
  SpecializationType,
} from '../schemas/housekeeping-staff.entity';

describe('HousekeepingStaffController', () => {
  let controller: HousekeepingStaffController;

  const id = '507f1f77bcf86cd799439011';
  const propertyId = '507f1f77bcf86cd799439012';
  const roomId = '507f1f77bcf86cd799439013';
  const params = { id };
  const query = { page: 1, limit: 10 };

  const serviceMock = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    restore: jest.fn(),
    search: jest.fn(),
    findByEmail: jest.fn(),
    findByEmployeeCode: jest.fn(),
    findBySpecialization: jest.fn(),
    findByProperty: jest.fn(),
    findAvailable: jest.fn(),
    resetDailyCounters: jest.fn(),
    resetMonthlyCounters: jest.fn(),
    getWorkload: jest.fn(),
    getPerformance: jest.fn(),
    activate: jest.fn(),
    deactivate: jest.fn(),
    suspend: jest.fn(),
    reactivate: jest.fn(),
    setStatus: jest.fn(),
    changePassword: jest.fn(),
    updateSchedule: jest.fn(),
    assignSupervisor: jest.fn(),
    setMonthlyTarget: jest.fn(),
    recordCleaning: jest.fn(),
    reportIssue: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HousekeepingStaffController],
      providers: [{ provide: HousekeepingStaffService, useValue: serviceMock }],
    }).compile();

    controller = module.get<HousekeepingStaffController>(
      HousekeepingStaffController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should convert the availability date', () => {
    void controller.findAvailable(propertyId, '2025-10-06T10:00:00.000Z');
    expect(serviceMock.findAvailable).toHaveBeenCalledWith(
      propertyId,
      new Date('2025-10-06T10:00:00.000Z'),
    );
    void controller.findAvailable(propertyId);
    expect(serviceMock.findAvailable).toHaveBeenLastCalledWith(
      propertyId,
      undefined,
    );
  });

  const createDto = {
    email: 'a@b.co',
    password: 'Secret123',
    property_id: propertyId,
    employee_code: 'HK-1',
  };
  const schedule = { shift_start: '07:00', shift_end: '15:00' };
  const cleaning = { room_id: roomId, room_number: '101', cleaning_time: 30 };
  const issue = {
    room_id: roomId,
    room_number: '101',
    issue_type: 'électricité',
    description: 'Ampoule grillée',
  };

  const cases: Array<[string, () => unknown, jest.Mock, unknown[]]> = [
    [
      'create',
      () => controller.create(createDto),
      serviceMock.create,
      [createDto],
    ],
    ['findAll', () => controller.findAll(query), serviceMock.findAll, [query]],
    ['search', () => controller.search('ana'), serviceMock.search, ['ana']],
    [
      'findByEmail',
      () => controller.findByEmail('a@b.co'),
      serviceMock.findByEmail,
      ['a@b.co'],
    ],
    [
      'findByEmployeeCode',
      () => controller.findByEmployeeCode('HK-1'),
      serviceMock.findByEmployeeCode,
      ['HK-1'],
    ],
    [
      'findBySpecialization',
      () => controller.findBySpecialization(SpecializationType.ROOMS, query),
      serviceMock.findBySpecialization,
      [SpecializationType.ROOMS, query],
    ],
    [
      'findByProperty',
      () =>
        controller.findByProperty(propertyId, query, HousekeepingStatus.ACTIVE),
      serviceMock.findByProperty,
      [propertyId, query, HousekeepingStatus.ACTIVE],
    ],
    [
      'resetDailyCounters',
      () => controller.resetDailyCounters(propertyId),
      serviceMock.resetDailyCounters,
      [propertyId],
    ],
    [
      'resetMonthlyCounters',
      () => controller.resetMonthlyCounters(propertyId),
      serviceMock.resetMonthlyCounters,
      [propertyId],
    ],
    ['findOne', () => controller.findOne(params), serviceMock.findOne, [id]],
    [
      'getWorkload',
      () => controller.getWorkload(params),
      serviceMock.getWorkload,
      [id],
    ],
    [
      'getPerformance',
      () => controller.getPerformance(params),
      serviceMock.getPerformance,
      [id],
    ],
    [
      'update',
      () => controller.update(params, { supervisor_name: 'Chef' }),
      serviceMock.update,
      [id, { supervisor_name: 'Chef' }],
    ],
    ['activate', () => controller.activate(params), serviceMock.activate, [id]],
    [
      'deactivate',
      () => controller.deactivate(params),
      serviceMock.deactivate,
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
      'setStatus',
      () => controller.setStatus(params, { status: HousekeepingStatus.SICK }),
      serviceMock.setStatus,
      [id, HousekeepingStatus.SICK],
    ],
    [
      'changePassword',
      () =>
        controller.changePassword(params, {
          current_password: 'old',
          new_password: 'NewPassword1',
        }),
      serviceMock.changePassword,
      [id, 'old', 'NewPassword1'],
    ],
    [
      'updateSchedule',
      () => controller.updateSchedule(params, schedule),
      serviceMock.updateSchedule,
      [id, schedule],
    ],
    [
      'assignSupervisor',
      () =>
        controller.assignSupervisor(params, {
          supervisor_id: propertyId,
          supervisor_name: 'Chef',
        }),
      serviceMock.assignSupervisor,
      [id, propertyId, 'Chef'],
    ],
    [
      'setMonthlyTarget',
      () => controller.setMonthlyTarget(params, { monthly_target: 80 }),
      serviceMock.setMonthlyTarget,
      [id, 80],
    ],
    [
      'recordCleaning',
      () => controller.recordCleaning(params, cleaning),
      serviceMock.recordCleaning,
      [id, cleaning],
    ],
    [
      'reportIssue',
      () => controller.reportIssue(params, issue),
      serviceMock.reportIssue,
      [id, issue],
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
