import { Test, TestingModule } from '@nestjs/testing';
import { PaymentController } from './payment.controller';
import { PaymentService } from '../services/payment.service';

describe('PaymentController', () => {
  let controller: PaymentController;
  let service: PaymentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentController],
      providers: [
        {
          provide: PaymentService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            findByTransactionId: jest.fn(),
            findByReservation: jest.fn(),
            findByGuest: jest.fn(),
            getDailyCashup: jest.fn(),
            markAsCompleted: jest.fn(),
            refund: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<PaymentController>(PaymentController);
    service = module.get<PaymentService>(PaymentService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate refund to the service', () => {
    controller.refund({ id: '507f1f77bcf86cd799439011' } as any, {
      amount: 50,
      reason: 'Erreur',
    });
    expect(service.refund).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439011',
      50,
      'Erreur',
    );
  });
});
