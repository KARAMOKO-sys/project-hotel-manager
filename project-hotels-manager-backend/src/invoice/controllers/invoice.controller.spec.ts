import { Test, TestingModule } from '@nestjs/testing';
import { InvoiceController } from './invoice.controller';
import { InvoiceService } from '../services/invoice.service';

describe('InvoiceController', () => {
  let controller: InvoiceController;
  let service: InvoiceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvoiceController],
      providers: [
        {
          provide: InvoiceService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            findByReservation: jest.fn(),
            findByGuest: jest.fn(),
            markAsPaid: jest.fn(),
            markAsOverdue: jest.fn(),
            markAsCancelled: jest.fn(),
            getOutstandingInvoices: jest.fn(),
            addItem: jest.fn(),
            removeItem: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<InvoiceController>(InvoiceController);
    service = module.get<InvoiceService>(InvoiceService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate markAsPaid to the service', () => {
    controller.markAsPaid({ id: '507f1f77bcf86cd799439011' } as any);
    expect(service.markAsPaid).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
  });
});
