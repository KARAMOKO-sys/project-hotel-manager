import { Test, TestingModule } from '@nestjs/testing';
import { OwnersController } from './owners.controller';
import { OwnersService } from '../services/owners.service';
import { OwnerStatus, OwnerSubscriptionPlan } from '../schemas/owner.entity';

describe('OwnersController', () => {
  let controller: OwnersController;

  const id = '507f1f77bcf86cd799439011';
  const propertyId = '507f1f77bcf86cd799439012';
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
    findPendingVerification: jest.fn(),
    findExpiringSubscriptions: jest.fn(),
    findByStatus: jest.fn(),
    findByEmail: jest.fn(),
    findByProperty: jest.fn(),
    getSubscriptionStatus: jest.fn(),
    getProfileCompleteness: jest.fn(),
    verify: jest.fn(),
    reject: jest.fn(),
    suspend: jest.fn(),
    reactivate: jest.fn(),
    activate: jest.fn(),
    deactivate: jest.fn(),
    changePassword: jest.fn(),
    updateSubscription: jest.fn(),
    addProperty: jest.fn(),
    removeProperty: jest.fn(),
    addRevenue: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OwnersController],
      providers: [{ provide: OwnersService, useValue: serviceMock }],
    }).compile();

    controller = module.get<OwnersController>(OwnersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  const createDto = { email: 'a@b.co', password: 'Secret123' };
  const subscription = {
    subscription_plan: OwnerSubscriptionPlan.ENTERPRISE,
  };

  const cases: Array<[string, () => unknown, jest.Mock, unknown[]]> = [
    [
      'create',
      () => controller.create(createDto),
      serviceMock.create,
      [createDto],
    ],
    ['findAll', () => controller.findAll(query), serviceMock.findAll, [query]],
    ['search', () => controller.search('yao'), serviceMock.search, ['yao']],
    [
      'findPendingVerification',
      () => controller.findPendingVerification(query),
      serviceMock.findPendingVerification,
      [query],
    ],
    [
      'findExpiringSubscriptions',
      () => controller.findExpiringSubscriptions(15),
      serviceMock.findExpiringSubscriptions,
      [15],
    ],
    [
      'findByStatus',
      () => controller.findByStatus(OwnerStatus.ACTIVE, query),
      serviceMock.findByStatus,
      [OwnerStatus.ACTIVE, query],
    ],
    [
      'findByEmail',
      () => controller.findByEmail('a@b.co'),
      serviceMock.findByEmail,
      ['a@b.co'],
    ],
    [
      'findByProperty',
      () => controller.findByProperty(propertyId),
      serviceMock.findByProperty,
      [propertyId],
    ],
    ['findOne', () => controller.findOne(params), serviceMock.findOne, [id]],
    [
      'getSubscriptionStatus',
      () => controller.getSubscriptionStatus(params),
      serviceMock.getSubscriptionStatus,
      [id],
    ],
    [
      'getProfileCompleteness',
      () => controller.getProfileCompleteness(params),
      serviceMock.getProfileCompleteness,
      [id],
    ],
    [
      'update',
      () => controller.update(params, { company_name: 'SCI' }),
      serviceMock.update,
      [id, { company_name: 'SCI' }],
    ],
    [
      'verify',
      () => controller.verify(params, { verified_by: propertyId }),
      serviceMock.verify,
      [id, propertyId],
    ],
    [
      'reject',
      () => controller.reject(params, { reason: 'Incomplet' }),
      serviceMock.reject,
      [id, 'Incomplet'],
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
    ['activate', () => controller.activate(params), serviceMock.activate, [id]],
    [
      'deactivate',
      () => controller.deactivate(params),
      serviceMock.deactivate,
      [id],
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
      'updateSubscription',
      () => controller.updateSubscription(params, subscription),
      serviceMock.updateSubscription,
      [id, subscription],
    ],
    [
      'addProperty',
      () => controller.addProperty(params, { property_id: propertyId }),
      serviceMock.addProperty,
      [id, propertyId],
    ],
    [
      'removeProperty',
      () => controller.removeProperty(params, propertyId),
      serviceMock.removeProperty,
      [id, propertyId],
    ],
    [
      'addRevenue',
      () => controller.addRevenue(params, { amount: 1000 }),
      serviceMock.addRevenue,
      [id, 1000],
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
