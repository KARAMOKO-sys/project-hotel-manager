import { Test, TestingModule } from '@nestjs/testing';
import { InvoiceItemController } from './invoice-item.controller';
import { InvoiceItemService } from '../services/invoice-item.service';

describe('InvoiceItemController', () => {
  let controller: InvoiceItemController;
  let service: InvoiceItemService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvoiceItemController],
      providers: [
        {
          provide: InvoiceItemService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            findByInvoice: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<InvoiceItemController>(InvoiceItemController);
    service = module.get<InvoiceItemService>(InvoiceItemService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate create to the service', () => {
    const dto = {
      invoice_id: '507f1f77bcf86cd799439011',
      description: 'x',
      unit_price: 10,
    };
    controller.create(dto as any);
    expect(service.create).toHaveBeenCalledWith(dto);
  });
});
