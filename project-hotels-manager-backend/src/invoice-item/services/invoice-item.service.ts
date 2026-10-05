import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseCrudService } from '../../common/services/base-crud.service';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import {
  InvoiceItem,
  InvoiceItemDocument,
} from '../schemas/invoice-item.entity';
import { CreateInvoiceItemDto } from '../dto/create-invoice-item.dto';
import { UpdateInvoiceItemDto } from '../dto/update-invoice-item.dto';

/**
 * Service de gestion des lignes de facture.
 */
@Injectable()
export class InvoiceItemService extends BaseCrudService<
  InvoiceItem,
  CreateInvoiceItemDto,
  UpdateInvoiceItemDto
> {
  constructor(
    @InjectModel(InvoiceItem.name)
    protected readonly invoiceItemModel: Model<InvoiceItemDocument>,
  ) {
    super(invoiceItemModel, InvoiceItem.name);
  }

  /** Crée une ligne en calculant le total si nécessaire. */
  async create(
    createInvoiceItemDto: CreateInvoiceItemDto,
  ): Promise<InvoiceItem> {
    const quantity = createInvoiceItemDto.quantity ?? 1;
    const total =
      createInvoiceItemDto.total ?? quantity * createInvoiceItemDto.unit_price;
    return super.create({ ...createInvoiceItemDto, quantity, total } as any);
  }

  /** Liste les lignes d'une facture. */
  findByInvoice(invoiceId: string, query: PaginationQueryDto) {
    return this.findAll(query, {
      invoice_id: new Types.ObjectId(invoiceId),
    });
  }
}
