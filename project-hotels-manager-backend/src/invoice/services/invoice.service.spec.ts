import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { InvoiceService } from './invoice.service';
import { Invoice } from '../schemas/invoice.entity';
import { InvoiceItem } from '../../invoice-item/schemas/invoice-item.entity';
import { InvoiceStatus } from '../../base-entities/enums/invoice-status.enum';

describe('InvoiceService', () => {
  let service: InvoiceService;
  let model: any;
  let itemModel: any;

  const invoice = {
    _id: new Types.ObjectId(),
    invoice_number: 'INV-1',
    subtotal: 0,
    tax_amount: 10,
    discount_amount: 0,
    total_amount: 0,
    status: InvoiceStatus.DRAFT,
  };

  beforeEach(async () => {
    const ModelMock: any = function (data: any) {
      const doc = { ...invoice, ...data };
      doc.save = jest.fn().mockResolvedValue(doc);
      return doc;
    };
    ModelMock.findById = jest
      .fn()
      .mockReturnValue({ exec: jest.fn().mockResolvedValue(invoice) });
    ModelMock.findByIdAndUpdate = jest.fn().mockReturnValue({
      exec: jest
        .fn()
        .mockResolvedValue({ ...invoice, status: InvoiceStatus.PAID }),
    });
    ModelMock.find = jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([invoice]),
    });
    ModelMock.countDocuments = jest
      .fn()
      .mockReturnValue({ exec: jest.fn().mockResolvedValue(1) });

    itemModel = {
      find: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([{ total: 100 }]),
      }),
      create: jest.fn().mockResolvedValue({}),
      findByIdAndDelete: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
    };

    model = ModelMock;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoiceService,
        { provide: getModelToken(Invoice.name), useValue: model },
        { provide: getModelToken(InvoiceItem.name), useValue: itemModel },
      ],
    }).compile();

    service = module.get<InvoiceService>(InvoiceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create an invoice with a number and computed total', async () => {
    const result = await service.create({
      subtotal: 100,
      tax_amount: 10,
    } as any);
    expect(result.invoice_number).toMatch(/^INV-/);
    expect(result.total_amount).toBe(110);
  });

  it('should mark an invoice as paid', async () => {
    const result = await service.markAsPaid(invoice._id.toString());
    expect(result.status).toBe(InvoiceStatus.PAID);
  });

  it('should list outstanding invoices', async () => {
    const result = await service.getOutstandingInvoices(
      '507f1f77bcf86cd799439011',
    );
    expect(result).toEqual([invoice]);
  });

  it('should recalculate totals from items', async () => {
    await service.recalculateTotals(invoice._id.toString());
    expect(itemModel.find).toHaveBeenCalled();
    expect(model.findByIdAndUpdate).toHaveBeenCalled();
  });
});
