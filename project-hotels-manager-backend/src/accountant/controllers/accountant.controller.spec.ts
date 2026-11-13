import { Test, TestingModule } from '@nestjs/testing';
import { AccountantController } from './accountant.controller';
import { AccountantService } from '../services/accountant.service';
import { AccountantStatus } from '../schemas/accountant.entity';

describe('AccountantController', () => {
  let controller: AccountantController;

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
    findByEmail: jest.fn(),
    findByEmployeeCode: jest.fn(),
    findByProperty: jest.fn(),
    activate: jest.fn(),
    deactivate: jest.fn(),
    suspend: jest.fn(),
    reactivate: jest.fn(),
    changePassword: jest.fn(),
    updatePermissions: jest.fn(),
    checkApproval: jest.fn(),
    addCertification: jest.fn(),
    removeCertification: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AccountantController],
      providers: [{ provide: AccountantService, useValue: serviceMock }],
    }).compile();

    controller = module.get<AccountantController>(AccountantController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  const createDto = {
    email: 'a@b.co',
    password: 'Secret123',
    property_id: propertyId,
    employee_code: 'ACC-1',
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
      () => controller.findByEmployeeCode('ACC-1'),
      serviceMock.findByEmployeeCode,
      ['ACC-1'],
    ],
    [
      'findByProperty',
      () =>
        controller.findByProperty(propertyId, query, AccountantStatus.ACTIVE),
      serviceMock.findByProperty,
      [propertyId, query, AccountantStatus.ACTIVE],
    ],
    ['findOne', () => controller.findOne(params), serviceMock.findOne, [id]],
    [
      'checkApproval',
      () => controller.checkApproval(params, 250),
      serviceMock.checkApproval,
      [id, 250],
    ],
    [
      'update',
      () => controller.update(params, { certification: 'DSCG' }),
      serviceMock.update,
      [id, { certification: 'DSCG' }],
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
      'updatePermissions',
      () => controller.updatePermissions(params, { can_process_refunds: true }),
      serviceMock.updatePermissions,
      [id, { can_process_refunds: true }],
    ],
    [
      'addCertification',
      () => controller.addCertification(params, { certification: 'DSCG' }),
      serviceMock.addCertification,
      [id, 'DSCG'],
    ],
    [
      'removeCertification',
      () => controller.removeCertification(params, 'DSCG'),
      serviceMock.removeCertification,
      [id, 'DSCG'],
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
