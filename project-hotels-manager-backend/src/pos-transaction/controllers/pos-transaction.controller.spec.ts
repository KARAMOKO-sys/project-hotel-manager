import { Test, TestingModule } from '@nestjs/testing';
import { PosTransactionController } from './pos-transaction.controller';
import { PosTransactionService } from '../services/pos-transaction.service';

describe('PosTransactionController', () => {
  let controller: PosTransactionController;
  let service: Record<string, jest.Mock>;
  const id = '507f1f77bcf86cd799439011';
  const otherId = '507f1f77bcf86cd799439012';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PosTransactionController],
      providers: [
        {
          provide: PosTransactionService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            findByNumber: jest.fn(),
            findByReservation: jest.fn(),
            findByGuest: jest.fn(),
            getRoomCharges: jest.fn(),
            getDailySales: jest.fn(),
            getTopSellingItems: jest.fn(),
            void: jest.fn(),
            refund: jest.fn(),
            settle: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<PosTransactionController>(PosTransactionController);
    service = module.get(PosTransactionService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates void / refund / settle', async () => {
    await controller.void({ id }, { reason: 'Erreur' });
    await controller.refund({ id }, { amount: 100 });
    await controller.settle({ id }, { invoice_id: otherId });
    expect(service.void).toHaveBeenCalledWith(id, 'Erreur');
    expect(service.refund).toHaveBeenCalledWith(id, { amount: 100 });
    expect(service.settle).toHaveBeenCalledWith(id, otherId);
  });

  it('parses dates for reports', async () => {
    await controller.getDailySales(otherId, '2026-10-06');
    await controller.getTopSellingItems(otherId, {
      from: '2026-10-01',
      to: '2026-10-31',
      limit: 3,
    });
    expect(service.getDailySales).toHaveBeenCalledWith(
      otherId,
      new Date('2026-10-06'),
    );
    expect(service.getTopSellingItems).toHaveBeenCalledWith(
      otherId,
      new Date('2026-10-01'),
      new Date('2026-10-31'),
      3,
    );
  });

  it('delegates reservation lookups', async () => {
    await controller.getRoomCharges(otherId);
    await controller.findByReservation(otherId, { page: 1, limit: 10 });
    expect(service.getRoomCharges).toHaveBeenCalledWith(otherId);
    expect(service.findByReservation).toHaveBeenCalledWith(otherId, {
      page: 1,
      limit: 10,
    });
  });
});
