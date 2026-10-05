import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { PaymentService } from './payment.service';
import { Payment } from '../schemas/payment.entity';
import { PaymentStatus } from '../../base-entities/enums/payment-status.enum';

describe('PaymentService', () => {
  let service: PaymentService;
  let model: any;

  const payment = {
    _id: new Types.ObjectId(),
    payment_number: 'PAY-1',
    amount: { amount: 100, currency: 'XOF' },
    status: PaymentStatus.COMPLETED,
    property_id: new Types.ObjectId(),
    transaction_id: 'TXN-1',
  };

  beforeEach(async () => {
    const ModelMock: any = function (data: any) {
      const doc = { ...payment, ...data };
      doc.save = jest.fn().mockResolvedValue(doc);
      return doc;
    };
    ModelMock.findById = jest
      .fn()
      .mockReturnValue({ exec: jest.fn().mockResolvedValue(payment) });
    ModelMock.findByIdAndUpdate = jest
      .fn()
      .mockReturnValue({ exec: jest.fn().mockResolvedValue(payment) });
    ModelMock.findOne = jest
      .fn()
      .mockReturnValue({ exec: jest.fn().mockResolvedValue(payment) });
    ModelMock.find = jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest
        .fn()
        .mockResolvedValue([
          { amount: { amount: 50 } },
          { amount: { amount: 30 } },
        ]),
    });
    ModelMock.countDocuments = jest
      .fn()
      .mockReturnValue({ exec: jest.fn().mockResolvedValue(1) });

    model = ModelMock;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: getModelToken(Payment.name), useValue: model },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a payment with number and change due', async () => {
    const result = await service.create({
      amount: { amount: 100, currency: 'XOF' },
      received_amount: 150,
    } as any);
    expect(result.payment_number).toMatch(/^PAY-/);
    expect(result.change_due).toBe(50);
  });

  it('should mark a payment as completed', async () => {
    await service.markAsCompleted(payment._id.toString());
    expect(model.findByIdAndUpdate).toHaveBeenCalled();
  });

  it('should find a payment by transaction id', async () => {
    await expect(service.findByTransactionId('TXN-1')).resolves.toEqual(
      payment,
    );
  });

  it('should compute daily cashup', async () => {
    const result = await service.getDailyCashup(payment.property_id.toString());
    expect(result.total).toBe(80);
    expect(result.count).toBe(2);
  });
});
