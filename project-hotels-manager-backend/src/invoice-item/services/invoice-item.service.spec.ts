import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { InvoiceItemService } from './invoice-item.service';
import { InvoiceItem } from '../schemas/invoice-item.entity';

describe('InvoiceItemService', () => {
  let service: InvoiceItemService;
  let model: any;

  const item = {
    _id: new Types.ObjectId(),
    invoice_id: new Types.ObjectId(),
    description: 'Chambre Deluxe',
    quantity: 1,
    unit_price: 100,
    total: 100,
  };

  beforeEach(async () => {
    const ModelMock: any = function (data: any) {
      const doc = { ...item, ...data };
      doc.save = jest.fn().mockResolvedValue(doc);
      return doc;
    };
    ModelMock.findById = jest
      .fn()
      .mockReturnValue({ exec: jest.fn().mockResolvedValue(item) });
    ModelMock.findByIdAndUpdate = jest
      .fn()
      .mockReturnValue({ exec: jest.fn().mockResolvedValue(item) });
    ModelMock.find = jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([item]),
    });
    ModelMock.countDocuments = jest
      .fn()
      .mockReturnValue({ exec: jest.fn().mockResolvedValue(1) });

    model = ModelMock;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoiceItemService,
        { provide: getModelToken(InvoiceItem.name), useValue: model },
      ],
    }).compile();

    service = module.get<InvoiceItemService>(InvoiceItemService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should compute total on create', async () => {
    const result = await service.create({
      invoice_id: item.invoice_id.toString(),
      description: 'Chambre Deluxe',
      unit_price: 100,
      quantity: 2,
    } as any);
    expect(result.total).toBe(200);
  });

  it('should list items by invoice', async () => {
    const result = await service.findByInvoice(item.invoice_id.toString(), {
      page: 1,
      limit: 10,
    } as any);
    expect(result.data).toEqual([item]);
  });
});
