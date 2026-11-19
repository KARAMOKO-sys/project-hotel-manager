import {
  BadRequestException,
  ConflictException,
  Injectable,
  Optional,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types } from 'mongoose';
import { BaseCrudService } from '../../common/services/base-crud.service';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { SequenceService } from '../../platform/sequences/sequence.service';
import { DomainEventPublisher } from '../../platform/events/domain-event.publisher';
import { DomainEvents } from '../../platform/events/domain-events';
import { InventoryService } from '../../inventory/services/inventory.service';
import { VendorBill, VendorBillLine } from '../schemas/vendor-bill.entity';
import { PurchaseOrder } from '../schemas/purchase-order.entity';
import {
  CreateVendorBillDto,
  MarkPaidDto,
  UpdateVendorBillDto,
  VendorBillQueryDto,
} from '../dto/vendor-bill.dto';
import {
  BillPurchaseOrderDto,
  PurchaseLineDto,
} from '../dto/purchase-order.dto';
import {
  addDays,
  billableQty,
  computeLineAmounts,
  PurchaseOrderState,
  roundMoney,
  roundQty,
  VendorBillState,
} from '../purchase.utils';
import { VendorService } from './vendor.service';
import { PurchaseOrderService } from './purchase-order.service';

const BILL_SEQUENCE = 'purchase.vendor_bill';

/**
 * Contrat de `DomainEvents.VENDOR_BILL_POSTED` consommé par la comptabilité.
 * Ne pas modifier sans coordination.
 */
export interface VendorBillPostedPayload {
  _id: string;
  property_id: string;
  number: string;
  vendor_id: string;
  vendor_name: string;
  date: string;
  currency: string;
  amount_untaxed: number;
  tax_amount: number;
  amount_total: number;
  lines: Array<{
    description: string;
    account_code?: string;
    amount_untaxed: number;
    tax_amount: number;
  }>;
}

/** Construit la charge utile de l'événement « facture fournisseur comptabilisée ». */
export function buildVendorBillPostedPayload(
  bill: VendorBill,
  vendorName: string,
): VendorBillPostedPayload {
  return {
    _id: String(bill._id),
    property_id: String(bill.property_id),
    number: bill.number,
    vendor_id: String(bill.vendor_id),
    vendor_name: vendorName,
    date: new Date(bill.bill_date).toISOString(),
    currency: bill.currency,
    amount_untaxed: bill.amount_untaxed,
    tax_amount: bill.tax_amount,
    amount_total: bill.amount_total,
    lines: bill.lines.map((line) => ({
      description: line.description,
      ...(line.account_code ? { account_code: line.account_code } : {}),
      amount_untaxed: line.amount_untaxed,
      tax_amount: line.tax_amount,
    })),
  };
}

function billTotals(lines: VendorBillLine[]) {
  const untaxed = roundMoney(lines.reduce((s, l) => s + l.amount_untaxed, 0));
  const tax = roundMoney(lines.reduce((s, l) => s + l.tax_amount, 0));
  return {
    amount_untaxed: untaxed,
    tax_amount: tax,
    amount_total: roundMoney(untaxed + tax),
  };
}

/** Factures fournisseurs. */
@Injectable()
export class VendorBillService extends BaseCrudService<
  VendorBill,
  CreateVendorBillDto,
  UpdateVendorBillDto
> {
  constructor(
    @InjectModel(VendorBill.name)
    protected readonly billModel: Model<VendorBill>,
    @InjectModel(PurchaseOrder.name)
    private readonly orderModel: Model<PurchaseOrder>,
    private readonly vendors: VendorService,
    private readonly orders: PurchaseOrderService,
    private readonly inventory: InventoryService,
    private readonly sequences: SequenceService,
    @Optional() private readonly events?: DomainEventPublisher,
  ) {
    super(billModel, VendorBill.name);
  }

  /** Facture saisie manuellement (sans bon de commande). */
  async create(
    dto: CreateVendorBillDto,
    actorId?: string,
  ): Promise<VendorBill> {
    const vendor = await this.vendors.getForProperty(
      dto.vendor_id,
      dto.property_id,
    );
    const lines = await this.buildLines(dto.property_id, dto.lines);
    const billDate = dto.bill_date ? new Date(dto.bill_date) : new Date();
    return super.create({
      property_id: new Types.ObjectId(dto.property_id),
      vendor_id: new Types.ObjectId(dto.vendor_id),
      number: await this.nextNumber(dto.property_id),
      vendor_reference: dto.vendor_reference,
      bill_date: billDate,
      due_date: dto.due_date
        ? new Date(dto.due_date)
        : addDays(billDate, vendor.payment_term_days ?? 0),
      currency: dto.currency ?? vendor.currency,
      lines,
      ...billTotals(lines),
      notes: dto.notes,
      state: VendorBillState.DRAFT,
      created_by: actorId,
    } as unknown as CreateVendorBillDto);
  }

  /**
   * Crée une facture brouillon à partir des quantités reçues et non encore
   * facturées d'un bon de commande. Les quantités facturées sont réservées
   * atomiquement (et libérées si la facture brouillon est annulée).
   */
  async createFromOrder(
    orderId: string,
    dto: BillPurchaseOrderDto,
    actorId?: string,
  ): Promise<VendorBill> {
    const order = await this.orders.findOne(orderId);
    const billable = [
      PurchaseOrderState.CONFIRMED,
      PurchaseOrderState.PARTIALLY_RECEIVED,
      PurchaseOrderState.RECEIVED,
    ];
    if (!billable.includes(order.state)) {
      throw new ConflictException(
        'Seul un bon de commande confirmé peut être facturé',
      );
    }
    const filter: Record<string, unknown> = {
      _id: order._id,
      state: { $in: billable },
    };
    const inc: Record<string, number> = {};
    const lines: VendorBillLine[] = [];
    order.lines.forEach((line, index) => {
      const qty = billableQty(line);
      if (qty <= 0) return;
      filter[`lines.${index}.billed_qty`] = line.billed_qty ?? 0;
      inc[`lines.${index}.billed_qty`] = qty;
      const base = {
        quantity: qty,
        unit_price: line.unit_price,
        tax_rate: line.tax_rate ?? 0,
      };
      lines.push({
        product_id: line.product_id,
        description: line.description,
        ...base,
        account_code: line.account_code,
        purchase_line_index: index,
        ...computeLineAmounts(base),
      });
    });
    if (lines.length === 0) {
      throw new BadRequestException(
        'Aucune quantité reçue restant à facturer sur ce bon de commande',
      );
    }
    const claimed = await this.orderModel
      .findOneAndUpdate(filter, { $inc: inc }, { new: true })
      .exec();
    if (!claimed) {
      throw new ConflictException(
        'Le bon de commande a changé ; veuillez actualiser puis réessayer',
      );
    }

    try {
      const vendor = await this.vendors.getForProperty(
        String(order.vendor_id),
        String(order.property_id),
      );
      const billDate = dto.bill_date ? new Date(dto.bill_date) : new Date();
      const bill = await super.create({
        property_id: order.property_id,
        vendor_id: order.vendor_id,
        purchase_order_id: order._id,
        number: await this.nextNumber(String(order.property_id)),
        vendor_reference: dto.vendor_reference,
        bill_date: billDate,
        due_date: addDays(billDate, vendor.payment_term_days ?? 0),
        currency: order.currency,
        lines,
        ...billTotals(lines),
        state: VendorBillState.DRAFT,
        created_by: actorId,
      } as unknown as CreateVendorBillDto);
      await this.orders.refreshBillingStatus(order._id);
      return bill;
    } catch (error) {
      await this.releaseBilledQty(order._id, lines);
      throw error;
    }
  }

  async update(id: string, dto: UpdateVendorBillDto): Promise<VendorBill> {
    const bill = await this.findOne(id);
    this.assertState(bill, VendorBillState.DRAFT, 'modifiée');
    if (dto.lines && bill.purchase_order_id) {
      throw new BadRequestException(
        "Les lignes d'une facture issue d'un bon de commande ne sont pas modifiables ; annulez-la puis refacturez",
      );
    }
    const set: Record<string, unknown> = {};
    if (dto.vendor_reference !== undefined) {
      set.vendor_reference = dto.vendor_reference;
    }
    if (dto.notes !== undefined) set.notes = dto.notes;
    if (dto.currency) set.currency = dto.currency;
    if (dto.bill_date) set.bill_date = new Date(dto.bill_date);
    if (dto.due_date) {
      set.due_date = new Date(dto.due_date);
    } else if (dto.bill_date) {
      const vendor = await this.vendors.getForProperty(
        String(bill.vendor_id),
        String(bill.property_id),
      );
      set.due_date = addDays(
        new Date(dto.bill_date),
        vendor.payment_term_days ?? 0,
      );
    }
    if (dto.lines) {
      const lines = await this.buildLines(String(bill.property_id), dto.lines);
      set.lines = lines;
      Object.assign(set, billTotals(lines));
    }
    return this.transition(bill, VendorBillState.DRAFT, set);
  }

  async findAll(
    query: VendorBillQueryDto,
    filter: QueryFilter<VendorBill> = {},
  ): Promise<PaginatedResult<VendorBill>> {
    const criteria: Record<string, unknown> = { ...filter };
    if (query.property_id) {
      criteria.property_id = new Types.ObjectId(query.property_id);
    }
    if (query.vendor_id)
      criteria.vendor_id = new Types.ObjectId(query.vendor_id);
    if (query.purchase_order_id) {
      criteria.purchase_order_id = new Types.ObjectId(query.purchase_order_id);
    }
    if (query.state) criteria.state = query.state;
    if (query.from || query.to) {
      const range: Record<string, Date> = {};
      if (query.from) range.$gte = new Date(query.from);
      if (query.to) range.$lte = new Date(query.to);
      criteria.bill_date = range;
    }
    if (query.search) criteria.number = query.search.trim().toUpperCase();
    return super.findAll(query, criteria);
  }

  async remove(id: string): Promise<VendorBill> {
    const bill = await this.findOne(id);
    if (bill.state !== VendorBillState.CANCELLED) {
      throw new ConflictException('Annulez la facture avant de la supprimer');
    }
    return super.remove(id);
  }

  /** Comptabilise la facture et publie `VENDOR_BILL_POSTED`. */
  async post(id: string, actorId?: string): Promise<VendorBill> {
    const bill = await this.findOne(id);
    this.assertState(bill, VendorBillState.DRAFT, 'comptabilisée');
    if (!bill.lines?.length || bill.amount_total <= 0) {
      throw new BadRequestException(
        'Une facture sans montant ne peut pas être comptabilisée',
      );
    }
    const posted = await this.transition(bill, VendorBillState.DRAFT, {
      state: VendorBillState.POSTED,
      posted_at: new Date(),
      posted_by: actorId,
    });
    const names = await this.vendors.namesById([posted.vendor_id]);
    const payload = buildVendorBillPostedPayload(
      posted,
      names.get(String(posted.vendor_id)) ?? '',
    );
    await this.events?.publish(DomainEvents.VENDOR_BILL_POSTED, {
      property_id: payload.property_id,
      actor_id: actorId,
      record: { model: VendorBill.name, id: payload._id },
      payload,
    });
    return posted;
  }

  /** Enregistre le règlement d'une facture comptabilisée. */
  async markPaid(
    id: string,
    dto: MarkPaidDto,
    actorId?: string,
  ): Promise<VendorBill> {
    const bill = await this.findOne(id);
    this.assertState(bill, VendorBillState.POSTED, 'marquée payée');
    return this.transition(bill, VendorBillState.POSTED, {
      state: VendorBillState.PAID,
      paid_at: dto.paid_at ? new Date(dto.paid_at) : new Date(),
      paid_by: actorId,
      payment_reference: dto.payment_reference,
    });
  }

  /** Annule une facture brouillon (libère les quantités du bon de commande). */
  async cancel(id: string): Promise<VendorBill> {
    const bill = await this.findOne(id);
    this.assertState(bill, VendorBillState.DRAFT, 'annulée');
    const cancelled = await this.transition(bill, VendorBillState.DRAFT, {
      state: VendorBillState.CANCELLED,
    });
    if (bill.purchase_order_id) {
      await this.releaseBilledQty(bill.purchase_order_id, bill.lines);
      await this.orders.refreshBillingStatus(bill.purchase_order_id);
    }
    return cancelled;
  }

  // ---------------------------------------------------------------------------

  private nextNumber(propertyId: string) {
    return this.sequences.next(BILL_SEQUENCE, {
      prefix: 'FF',
      scopeId: propertyId,
    });
  }

  private async releaseBilledQty(
    orderId: Types.ObjectId,
    lines: VendorBillLine[],
  ) {
    const inc: Record<string, number> = {};
    for (const line of lines) {
      if (line.purchase_line_index === undefined) continue;
      const key = `lines.${line.purchase_line_index}.billed_qty`;
      inc[key] = roundQty((inc[key] ?? 0) - line.quantity);
    }
    if (Object.keys(inc).length === 0) return;
    await this.orderModel.updateOne({ _id: orderId }, { $inc: inc }).exec();
  }

  private async buildLines(
    propertyId: string,
    lines: PurchaseLineDto[],
  ): Promise<VendorBillLine[]> {
    const built: VendorBillLine[] = [];
    for (const [index, dto] of lines.entries()) {
      let description = dto.description?.trim();
      if (dto.product_id) {
        const product = await this.inventory.findProduct(dto.product_id);
        if (!product || String(product.property_id) !== propertyId) {
          throw new BadRequestException(
            `Ligne ${index + 1} : article introuvable dans cet établissement`,
          );
        }
        description = description || product.name;
      }
      if (!description) {
        throw new BadRequestException(
          `Ligne ${index + 1} : une description ou un article est requis`,
        );
      }
      const base = {
        quantity: roundQty(dto.quantity),
        unit_price: roundMoney(dto.unit_price),
        tax_rate: dto.tax_rate ?? 0,
      };
      built.push({
        product_id: dto.product_id
          ? new Types.ObjectId(dto.product_id)
          : undefined,
        description,
        ...base,
        account_code: dto.account_code,
        ...computeLineAmounts(base),
      });
    }
    return built;
  }

  private assertState(bill: VendorBill, state: VendorBillState, verb: string) {
    if (bill.state !== state) {
      throw new ConflictException(
        `Une facture à l'état « ${bill.state} » ne peut pas être ${verb}`,
      );
    }
  }

  private async transition(
    bill: VendorBill,
    from: VendorBillState,
    set: Record<string, unknown>,
  ): Promise<VendorBill> {
    const updated = await this.billModel
      .findOneAndUpdate(
        { _id: bill._id, state: from },
        { $set: set },
        { new: true, runValidators: true },
      )
      .exec();
    if (!updated) {
      throw new ConflictException(
        'La facture a changé ; veuillez actualiser puis réessayer',
      );
    }
    return updated;
  }
}
