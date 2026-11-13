import { Test, TestingModule } from '@nestjs/testing';
import { ReceptionistController } from './receptionist.controller';
import { ReceptionistService } from '../services/receptionist.service';
import {
  ReceptionistShiftType,
  ReceptionistStatus,
} from '../schemas/receptionist.entity';

describe('ReceptionistController', () => {
  let controller: ReceptionistController;

  const id = '507f1f77bcf86cd799439011';
  const propertyId = '507f1f77bcf86cd799439012';
  const params = { id };
  const query = { page: 1, limit: 10 };
  const schedule = { monday: { start: '08:00', end: '16:00' } };

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
    findByProperty: jest.fn(),
    findOnDuty: jest.fn(),
    findScheduledOn: jest.fn(),
    activate: jest.fn(),
    deactivate: jest.fn(),
    suspend: jest.fn(),
    reactivate: jest.fn(),
    setStatus: jest.fn(),
    changePassword: jest.fn(),
    startShift: jest.fn(),
    endShift: jest.fn(),
    updateSchedule: jest.fn(),
    getSchedule: jest.fn(),
    recordActivity: jest.fn(),
    updateSatisfactionScore: jest.fn(),
    checkDiscount: jest.fn(),
    getPerformance: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReceptionistController],
      providers: [{ provide: ReceptionistService, useValue: serviceMock }],
    }).compile();

    controller = module.get<ReceptionistController>(ReceptionistController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  const createDto = {
    email: 'a@b.co',
    password: 'Secret123',
    property_id: propertyId,
    employee_code: 'REC-1',
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
      'findOnDuty',
      () => controller.findOnDuty(propertyId),
      serviceMock.findOnDuty,
      [propertyId],
    ],
    [
      'findByEmail',
      () => controller.findByEmail('a@b.co'),
      serviceMock.findByEmail,
      ['a@b.co'],
    ],
    [
      'findByEmployeeCode',
      () => controller.findByEmployeeCode('REC-1'),
      serviceMock.findByEmployeeCode,
      ['REC-1'],
    ],
    [
      'findByProperty',
      () =>
        controller.findByProperty(propertyId, query, ReceptionistStatus.ACTIVE),
      serviceMock.findByProperty,
      [propertyId, query, ReceptionistStatus.ACTIVE],
    ],
    [
      'findScheduledOn',
      () => controller.findScheduledOn(propertyId, 'monday'),
      serviceMock.findScheduledOn,
      [propertyId, 'monday'],
    ],
    ['findOne', () => controller.findOne(params), serviceMock.findOne, [id]],
    [
      'getSchedule',
      () => controller.getSchedule(params),
      serviceMock.getSchedule,
      [id],
    ],
    [
      'getPerformance',
      () => controller.getPerformance(params),
      serviceMock.getPerformance,
      [id],
    ],
    [
      'checkDiscount',
      () => controller.checkDiscount(params, 15),
      serviceMock.checkDiscount,
      [id, 15],
    ],
    [
      'update',
      () => controller.update(params, { position: 'Chef' }),
      serviceMock.update,
      [id, { position: 'Chef' }],
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
      () =>
        controller.setStatus(params, { status: ReceptionistStatus.ON_LEAVE }),
      serviceMock.setStatus,
      [id, ReceptionistStatus.ON_LEAVE],
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
      'startShift',
      () => controller.startShift(params),
      serviceMock.startShift,
      [id],
    ],
    ['endShift', () => controller.endShift(params), serviceMock.endShift, [id]],
    [
      'updateSchedule',
      () =>
        controller.updateSchedule(params, {
          shift_schedule: schedule,
          shift_type: ReceptionistShiftType.MORNING,
        }),
      serviceMock.updateSchedule,
      [id, schedule, ReceptionistShiftType.MORNING],
    ],
    [
      'recordActivity',
      () =>
        controller.recordActivity(params, {
          type: 'checkin',
          handling_time: 5,
        }),
      serviceMock.recordActivity,
      [id, 'checkin', 5],
    ],
    [
      'updateSatisfactionScore',
      () => controller.updateSatisfactionScore(params, { score: 4 }),
      serviceMock.updateSatisfactionScore,
      [id, 4],
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
