import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { randomBytes } from 'crypto';
import { BaseCrudService } from '../../common/services/base-crud.service';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { Invoice, InvoiceDocument } from '../schemas/invoice.entity';
import { CreateInvoiceDto } from '../dto/create-invoice.dto';
import { UpdateInvoiceDto } from '../dto/update-invoice.dto';
import {
  InvoiceItem,
  InvoiceItemDocument,
} from '../../invoice-item/schemas/invoice-item.entity';
import { CreateInvoiceItemDto } from '../../invoice-item/dto/create-invoice-item.dto';
import { InvoiceStatus } from '../../base-entities/enums/invoice-status.enum';

/**
 * Service de gestion des factures.
 *
 * Étend le CRUD générique et gère les lignes de facture (via `InvoiceItem`)
 * ainsi que le cycle de vie (émise, payée, en retard, annulée).
 */
@Injectable()
export class InvoiceService extends BaseCrudService<
  Invoice,
  CreateInvoiceDto,
  UpdateInvoiceDto
> {
  constructor(
    @InjectModel(Invoice.name)
    protected readonly invoiceModel: Model<InvoiceDocument>,
    @InjectModel(InvoiceItem.name)
    private readonly invoiceItemModel: Model<InvoiceItemDocument>,
  ) {
    super(invoiceModel, Invoice.name);
  }

  /** Crée une facture avec un numéro unique et un total cohérent. */
  async create(createInvoiceDto: CreateInvoiceDto): Promise<Invoice> {
    const subtotal = createInvoiceDto.subtotal ?? 0;
    const tax = createInvoiceDto.tax_amount ?? 0;
    const discount = createInvoiceDto.discount_amount ?? 0;
    const total_amount =
      createInvoiceDto.total_amount ?? subtotal + tax - discount;

    return super.create({
      ...createInvoiceDto,
      invoice_number: this.generateInvoiceNumber(),
      subtotal,
      total_amount,
    } as any);
  }

  /** Liste les factures d'une réservation. */
  findByReservation(reservationId: string, query: PaginationQueryDto) {
    return this.findAll(query, {
      reservation_id: new Types.ObjectId(reservationId),
    });
  }

  /** Liste les factures d'un client. */
  findByGuest(guestId: string, query: PaginationQueryDto) {
    return this.findAll(query, { guest_id: new Types.ObjectId(guestId) });
  }

  /** Marque la facture comme payée. */
  async markAsPaid(id: string): Promise<Invoice> {
    return this.update(id, { status: InvoiceStatus.PAID } as UpdateInvoiceDto);
  }

  /** Marque la facture comme en retard. */
  async markAsOverdue(id: string): Promise<Invoice> {
    return this.update(id, {
      status: InvoiceStatus.OVERDUE,
    } as UpdateInvoiceDto);
  }

  /** Marque la facture comme annulée. */
  async markAsCancelled(id: string): Promise<Invoice> {
    return this.update(id, {
      status: InvoiceStatus.CANCELLED,
    } as UpdateInvoiceDto);
  }

  /** Liste les factures impayées d'une propriété. */
  async getOutstandingInvoices(propertyId: string): Promise<Invoice[]> {
    return this.invoiceModel
      .find({
        property_id: new Types.ObjectId(propertyId),
        status: { $in: [InvoiceStatus.ISSUED, InvoiceStatus.OVERDUE] },
        is_deleted: { $ne: true },
      })
      .exec() as unknown as Promise<Invoice[]>;
  }

  /** Ajoute une ligne de facture puis recalcule les totaux. */
  async addItem(
    invoiceId: string,
    createItemDto: CreateInvoiceItemDto,
  ): Promise<Invoice> {
    await this.findOne(invoiceId);

    const quantity = createItemDto.quantity ?? 1;
    const total = createItemDto.total ?? quantity * createItemDto.unit_price;

    await this.invoiceItemModel.create({
      ...createItemDto,
      invoice_id: new Types.ObjectId(invoiceId),
      quantity,
      total,
    });

    return this.recalculateTotals(invoiceId);
  }

  /** Supprime une ligne de facture puis recalcule les totaux. */
  async removeItem(invoiceId: string, itemId: string): Promise<Invoice> {
    await this.invoiceItemModel.findByIdAndDelete(itemId).exec();
    return this.recalculateTotals(invoiceId);
  }

  /** Recalcule le sous-total et le total à partir des lignes de facture. */
  async recalculateTotals(invoiceId: string): Promise<Invoice> {
    const items = await this.invoiceItemModel
      .find({ invoice_id: new Types.ObjectId(invoiceId) })
      .exec();

    const subtotal = items.reduce((sum, item) => sum + (item.total ?? 0), 0);
    const invoice = await this.findOne(invoiceId);
    const total_amount =
      subtotal + (invoice.tax_amount ?? 0) - (invoice.discount_amount ?? 0);

    return this.update(invoiceId, {
      subtotal,
      total_amount,
    } as UpdateInvoiceDto);
  }

  /** Génère un numéro de facture lisible et unique. */
  private generateInvoiceNumber(): string {
    const suffix = randomBytes(3).toString('hex').toUpperCase();
    return `INV-${Date.now()}-${suffix}`;
  }
}
