import { Test, TestingModule } from '@nestjs/testing';
import { PartnerController } from './partner.controller';
import { PartnerService } from '../services/partner.service';
import { PartnerStatus, PartnerType } from '../schemas/partner.entity';
import { CreatePartnerDto } from '../dto/create-partner.dto';

describe('PartnerController', () => {
  let controller: PartnerController;

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
    findPending: jest.fn(),
    getStatistics: jest.fn(),
    findByStatus: jest.fn(),
    findByType: jest.fn(),
    findByEmail: jest.fn(),
    calculateCommission: jest.fn(),
    approve: jest.fn(),
    reject: jest.fn(),
    suspend: jest.fn(),
    reactivate: jest.fn(),
    block: jest.fn(),
    activate: jest.fn(),
    deactivate: jest.fn(),
    changePassword: jest.fn(),
    updateCommissionRate: jest.fn(),
    setMaxProperties: jest.fn(),
    recordBooking: jest.fn(),
    addProperty: jest.fn(),
    removeProperty: jest.fn(),
    addReview: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PartnerController],
      providers: [{ provide: PartnerService, useValue: serviceMock }],
    }).compile();

    controller = module.get<PartnerController>(PartnerController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  const createDto: CreatePartnerDto = {
    email: 'a@b.co',
    password: 'Secret123',
    company_name: 'Immo',
    partner_type: PartnerType.DEVELOPER,
    terms_accepted: true,
    data_processing_accepted: true,
  };

  const cases: Array<[string, () => unknown, jest.Mock, unknown[]]> = [
    [
      'create',
      () => controller.create(createDto),
      serviceMock.create,
      [createDto],
    ],
    ['findAll', () => controller.findAll(query), serviceMock.findAll, [query]],
    ['search', () => controller.search('immo'), serviceMock.search, ['immo']],
    [
      'findPending',
      () => controller.findPending(query),
      serviceMock.findPending,
      [query],
    ],
    [
      'getStatistics',
      () => controller.getStatistics(),
      serviceMock.getStatistics,
      [],
    ],
    [
      'findByStatus',
      () => controller.findByStatus(PartnerStatus.ACTIVE, query),
      serviceMock.findByStatus,
      [PartnerStatus.ACTIVE, query],
    ],
    [
      'findByType',
      () => controller.findByType(PartnerType.DEVELOPER, query),
      serviceMock.findByType,
      [PartnerType.DEVELOPER, query],
    ],
    [
      'findByEmail',
      () => controller.findByEmail('a@b.co'),
      serviceMock.findByEmail,
      ['a@b.co'],
    ],
    ['findOne', () => controller.findOne(params), serviceMock.findOne, [id]],
    [
      'calculateCommission',
      () => controller.calculateCommission(params, 5000),
      serviceMock.calculateCommission,
      [id, 5000],
    ],
    [
      'update',
      () => controller.update(params, { company_name: 'New' }),
      serviceMock.update,
      [id, { company_name: 'New' }],
    ],
    [
      'approve',
      () => controller.approve(params, { verified_by: propertyId }),
      serviceMock.approve,
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
    [
      'block',
      () => controller.block(params, { reason: 'Fraude' }),
      serviceMock.block,
      [id, 'Fraude'],
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
      'updateCommissionRate',
      () => controller.updateCommissionRate(params, { commission_rate: 8 }),
      serviceMock.updateCommissionRate,
      [id, 8],
    ],
    [
      'setMaxProperties',
      () => controller.setMaxProperties(params, { max_properties: 20 }),
      serviceMock.setMaxProperties,
      [id, 20],
    ],
    [
      'recordBooking',
      () => controller.recordBooking(params, { amount: 1000 }),
      serviceMock.recordBooking,
      [id, 1000],
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
      'addReview',
      () => controller.addReview(params, { rating: 4 }),
      serviceMock.addReview,
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
