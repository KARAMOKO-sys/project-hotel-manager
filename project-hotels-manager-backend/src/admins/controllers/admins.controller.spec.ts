import { Test, TestingModule } from '@nestjs/testing';
import { AdminsController } from './admins.controller';
import { AdminsService } from '../services/admins.service';

describe('AdminsController', () => {
  let controller: AdminsController;

  const id = '507f1f77bcf86cd799439011';
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
    findByDepartment: jest.fn(),
    findByAccessLevel: jest.fn(),
    activate: jest.fn(),
    deactivate: jest.fn(),
    suspend: jest.fn(),
    reactivate: jest.fn(),
    changePassword: jest.fn(),
    updateAccessLevel: jest.fn(),
    updateIpWhitelist: jest.fn(),
    isIpAllowed: jest.fn(),
    markAudited: jest.fn(),
    getAlertContact: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminsController],
      providers: [{ provide: AdminsService, useValue: serviceMock }],
    }).compile();

    controller = module.get<AdminsController>(AdminsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  const cases: Array<[string, () => unknown, jest.Mock, unknown[]]> = [
    [
      'create',
      () => controller.create({ email: 'a@b.co', password: 'Secret123' }),
      serviceMock.create,
      [{ email: 'a@b.co', password: 'Secret123' }],
    ],
    ['findAll', () => controller.findAll(query), serviceMock.findAll, [query]],
    ['search', () => controller.search('awa'), serviceMock.search, ['awa']],
    [
      'findByEmail',
      () => controller.findByEmail('a@b.co'),
      serviceMock.findByEmail,
      ['a@b.co'],
    ],
    [
      'findByDepartment',
      () => controller.findByDepartment('IT', query),
      serviceMock.findByDepartment,
      ['IT', query],
    ],
    [
      'findByAccessLevel',
      () => controller.findByAccessLevel(3, query),
      serviceMock.findByAccessLevel,
      [3, query],
    ],
    ['findOne', () => controller.findOne(params), serviceMock.findOne, [id]],
    [
      'getAlertContact',
      () => controller.getAlertContact(params),
      serviceMock.getAlertContact,
      [id],
    ],
    [
      'isIpAllowed',
      () => controller.isIpAllowed(params, '1.2.3.4'),
      serviceMock.isIpAllowed,
      [id, '1.2.3.4'],
    ],
    [
      'update',
      () => controller.update(params, { department: 'IT' }),
      serviceMock.update,
      [id, { department: 'IT' }],
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
      () => controller.suspend(params, { reason: 'Audit' }),
      serviceMock.suspend,
      [id, 'Audit'],
    ],
    [
      'reactivate',
      () => controller.reactivate(params),
      serviceMock.reactivate,
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
      'updateAccessLevel',
      () => controller.updateAccessLevel(params, { access_level: 4 }),
      serviceMock.updateAccessLevel,
      [id, 4],
    ],
    [
      'updateIpWhitelist',
      () => controller.updateIpWhitelist(params, { ip_whitelist: ['::1'] }),
      serviceMock.updateIpWhitelist,
      [id, ['::1']],
    ],
    [
      'markAudited',
      () => controller.markAudited(params),
      serviceMock.markAudited,
      [id],
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
