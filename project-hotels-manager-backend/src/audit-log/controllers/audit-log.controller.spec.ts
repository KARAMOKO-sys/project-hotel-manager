import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogController } from './audit-log.controller';
import { AuditLogService } from '../services/audit-log.service';

describe('AuditLogController', () => {
  let controller: AuditLogController;
  let service: Record<string, jest.Mock>;
  const id = '507f1f77bcf86cd799439011';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditLogController],
      providers: [
        {
          provide: AuditLogService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            findByEntity: jest.fn(),
            findByActor: jest.fn(),
            findByDateRange: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuditLogController>(AuditLogController);
    service = module.get(AuditLogService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('exposes no update / delete route', () => {
    const proto = AuditLogController.prototype as unknown as Record<
      string,
      unknown
    >;
    expect(proto.update).toBeUndefined();
    expect(proto.remove).toBeUndefined();
  });

  it('delegates queries', async () => {
    const page = { page: 1, limit: 10 };
    await controller.findByEntity('Reservation', 'abc', page);
    await controller.findByActor(id, page);
    await controller.findByDateRange({
      ...page,
      from: '2026-10-01',
      to: '2026-10-31',
    });
    await controller.findOne({ id });
    expect(service.findByEntity).toHaveBeenCalledWith(
      'Reservation',
      'abc',
      page,
    );
    expect(service.findByActor).toHaveBeenCalledWith(id, page);
    expect(service.findByDateRange).toHaveBeenCalledWith(
      '2026-10-01',
      '2026-10-31',
      expect.objectContaining(page),
    );
    expect(service.findOne).toHaveBeenCalledWith(id);
  });

  it('delegates create', async () => {
    await controller.create({ action: 'login' });
    expect(service.create).toHaveBeenCalledWith({ action: 'login' });
  });
});
