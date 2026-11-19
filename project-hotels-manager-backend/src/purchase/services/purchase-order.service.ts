import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  Optional,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types } from 'mongoose';
import { BaseCrudService } from '../../common/services/base-crud.service';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { SequenceService } from '../../platform/sequences/sequence.service';
import {
  DomainEventPublisher,
  toEventPayload,
} from '../../platform/events/domain-event.publisher';
import {
  DomainEventName,
  DomainEvents,
} from '../../platform/events/domain-events';
import { InventoryService } from '../../inventory/services/inventory.service';
import { ProductType } from '../../inventory/inventory.enums';
import { isDuplicateKeyError } from '../../inventory/inventory.utils';
import type { StockLowPayload } from '../../inventory/services/stock-move.service';
import {
  PurchaseOrder,
  PurchaseOrderLine,
} from '../schemas/purchase-order.entity';
import {
  CreatePurchaseOrderDto,
  PurchaseLineDto,
  PurchaseOrderQueryDto,
  ReceivePurchaseOrderDto,
  UpdatePurchaseOrderDto,
} from '../dto/purchase-order.dto';
import {
  computeBillingStatus,
  computeLineAmounts,
  computeReceiptState,
  computeTotals,
  OPEN_ORDER_STATES,
  PurchaseOrderState,
  RECEIVABLE_STATES,
  requiresApproval,
  roundMoney,
  roundQty,
} from '../purchase.utils';
import { VendorService } from './vendor.service';
import { PurchaseSettingsService } from './purchase-settings.service';

const ORDER_SEQUENCE = 'purchase.order';

export interface ReceiveResult {
  order: PurchaseOrder;
  moves: string[];
  warnings: string[];
}

export type ReorderOutcome =
  'created_order' | 'added_line' | 'already_present' | 'nothing_to_order';

/**
 * Bons de commande fournisseurs.
 *
 * Cycle : brouillon → envoyé → (à approuver) → confirmé → partiellement
 * reçu → reçu ; annulation possible tant que rien n'est reçu ni facturé.
 * Les quantités reçues/facturées sont incrémentées par « compare-and-set »
 * (précondition sur la valeur lue) pour éviter les doubles réceptions.
 */
@Injectable()
export class PurchaseOrderService extends BaseCrudService<
  PurchaseOrder,
  CreatePurchaseOrderDto,
  UpdatePurchaseOrderDto
> {
  private readonly logger = new Logger(PurchaseOrderService.name);

  constructor(
    @InjectModel(PurchaseOrder.name)
    protected readonly orderModel: Model<PurchaseOrder>,
    private readonly vendors: VendorService,
    private readonly settings: PurchaseSettingsService,
    private readonly inventory: InventoryService,
    private readonly sequences: SequenceService,
    @Optional() private readonly events?: DomainEventPublisher,
  ) {
    super(orderModel, PurchaseOrder.name);
  }

  async create(
    dto: CreatePurchaseOrderDto,
    actorId?: string,
  ): Promise<PurchaseOrder> {
    const vendor = await this.vendors.getForProperty(
      dto.vendor_id,
      dto.property_id,
    );
    const lines = await this.buildLines(dto.property_id, dto.lines);
    const number = await this.sequences.next(ORDER_SEQUENCE, {
      prefix: 'BC',
      scopeId: dto.property_id,
    });
    return super.create({
      property_id: new Types.ObjectId(dto.property_id),
      vendor_id: new Types.ObjectId(dto.vendor_id),
      number,
      order_date: dto.order_date ? new Date(dto.order_date) : new Date(),
      expected_date: dto.expected_date
        ? new Date(dto.expected_date)
        : undefined,
      currency: dto.currency ?? vendor.currency,
      lines,
      ...computeTotals(lines),
      notes: dto.notes,
      state: PurchaseOrderState.DRAFT,
      created_by: actorId,
    } as unknown as CreatePurchaseOrderDto);
  }

  async update(
    id: string,
    dto: UpdatePurchaseOrderDto,
  ): Promise<PurchaseOrder> {
    const order = await this.findOne(id);
    const editable = [PurchaseOrderState.DRAFT, PurchaseOrderState.SENT];
    if (!editable.includes(order.state)) {
      throw new ConflictException(
        'Seul un bon de commande brouillon ou envoyé peut être modifié',
      );
    }
    const propertyId = String(order.property_id);
    const set: Record<string, unknown> = {};
    if (dto.vendor_id) {
      await this.vendors.getForProperty(dto.vendor_id, propertyId);
      set.vendor_id = new Types.ObjectId(dto.vendor_id);
    }
    if (dto.order_date) set.order_date = new Date(dto.order_date);
    if (dto.expected_date) set.expected_date = new Date(dto.expected_date);
    if (dto.currency) set.currency = dto.currency;
    if (dto.notes !== undefined) set.notes = dto.notes;
    if (dto.lines) {
      const lines = await this.buildLines(propertyId, dto.lines);
      set.lines = lines;
      Object.assign(set, computeTotals(lines));
    }
    const updated = await this.orderModel
      .findOneAndUpdate(
        { _id: order._id, state: { $in: editable } },
        { $set: set },
        { new: true, runValidators: true },
      )
      .exec();
    if (!updated) throw this.stateChanged();
    return updated;
  }

  async findAll(
    query: PurchaseOrderQueryDto,
    filter: QueryFilter<PurchaseOrder> = {},
  ): Promise<PaginatedResult<PurchaseOrder>> {
    const criteria: Record<string, unknown> = { ...filter };
    if (query.property_id) {
      criteria.property_id = new Types.ObjectId(query.property_id);
    }
    if (query.vendor_id)
      criteria.vendor_id = new Types.ObjectId(query.vendor_id);
    if (query.state) criteria.state = query.state;
    if (query.billing_status) criteria.billing_status = query.billing_status;
    if (query.from || query.to) {
      const range: Record<string, Date> = {};
      if (query.from) range.$gte = new Date(query.from);
      if (query.to) range.$lte = new Date(query.to);
      criteria.order_date = range;
    }
    if (query.search) criteria.number = query.search.trim().toUpperCase();
    return super.findAll(query, criteria);
  }

  async remove(id: string): Promise<PurchaseOrder> {
    const order = await this.findOne(id);
    if (
      ![PurchaseOrderState.DRAFT, PurchaseOrderState.CANCELLED].includes(
        order.state,
      )
    ) {
      throw new ConflictException(
        'Seul un bon de commande brouillon ou annulé peut être supprimé',
      );
    }
    return super.remove(id);
  }

  /** Marque la demande de prix comme envoyée au fournisseur. */
  async send(id: string): Promise<PurchaseOrder> {
    const order = await this.findOne(id);
    if (order.state !== PurchaseOrderState.DRAFT) {
      throw new ConflictException('Seul un brouillon peut être envoyé');
    }
    this.assertHasLines(order);
    return this.transition(order, [PurchaseOrderState.DRAFT], {
      state: PurchaseOrderState.SENT,
      sent_at: new Date(),
    });
  }

  /**
   * Confirme la commande. Au-delà du seuil d'approbation de
   * l'établissement, elle passe « à approuver ».
   */
  async confirm(id: string, actorId?: string): Promise<PurchaseOrder> {
    const order = await this.findOne(id);
    const from = [PurchaseOrderState.DRAFT, PurchaseOrderState.SENT];
    if (!from.includes(order.state)) {
      throw new ConflictException(
        'Seul un bon de commande brouillon ou envoyé peut être confirmé',
      );
    }
    this.assertHasLines(order);
    const { approval_threshold } = await this.settings.get(
      String(order.property_id),
    );
    if (requiresApproval(order.amount_total, approval_threshold)) {
      return this.transition(order, from, {
        state: PurchaseOrderState.TO_APPROVE,
        confirmed_by: actorId,
      });
    }
    const confirmed = await this.transition(order, from, {
      state: PurchaseOrderState.CONFIRMED,
      confirmed_at: new Date(),
      confirmed_by: actorId,
      is_system_generated: false,
    });
    await this.publish(
      DomainEvents.PURCHASE_ORDER_CONFIRMED,
      confirmed,
      actorId,
    );
    return confirmed;
  }

  /** Approuve une commande au-delà du seuil (permission dédiée). */
  async approve(id: string, actorId?: string): Promise<PurchaseOrder> {
    const order = await this.findOne(id);
    if (order.state !== PurchaseOrderState.TO_APPROVE) {
      throw new ConflictException(
        "Ce bon de commande n'est pas en attente d'approbation",
      );
    }
    const now = new Date();
    const approved = await this.transition(
      order,
      [PurchaseOrderState.TO_APPROVE],
      {
        state: PurchaseOrderState.CONFIRMED,
        approved_at: now,
        approved_by: actorId,
        confirmed_at: now,
        is_system_generated: false,
      },
    );
    await this.publish(
      DomainEvents.PURCHASE_ORDER_CONFIRMED,
      approved,
      actorId,
    );
    return approved;
  }

  /** Annule une commande dont rien n'a été reçu ni facturé. */
  async cancel(id: string): Promise<PurchaseOrder> {
    const order = await this.findOne(id);
    const from = [
      PurchaseOrderState.DRAFT,
      PurchaseOrderState.SENT,
      PurchaseOrderState.TO_APPROVE,
      PurchaseOrderState.CONFIRMED,
    ];
    if (!from.includes(order.state)) {
      throw new ConflictException(
        'Impossible d’annuler : des marchandises ont déjà été reçues',
      );
    }
    if (
      order.lines.some(
        (l) => (l.received_qty ?? 0) > 0 || (l.billed_qty ?? 0) > 0,
      )
    ) {
      throw new ConflictException(
        'Impossible d’annuler : des quantités ont déjà été reçues ou facturées',
      );
    }
    const updated = await this.orderModel
      .findOneAndUpdate(
        {
          _id: order._id,
          state: { $in: from },
          'lines.received_qty': { $not: { $gt: 0 } },
          'lines.billed_qty': { $not: { $gt: 0 } },
        },
        {
          $set: {
            state: PurchaseOrderState.CANCELLED,
            cancelled_at: new Date(),
            is_system_generated: false,
          },
        },
        { new: true },
      )
      .exec();
    if (!updated) throw this.stateChanged();
    return updated;
  }

  /**
   * Réception (totale ou partielle) : incrémente les quantités reçues puis
   * crée les entrées en stock des articles stockés.
   */
  async receive(
    id: string,
    dto: ReceivePurchaseOrderDto,
    actorId?: string,
  ): Promise<ReceiveResult> {
    const order = await this.findOne(id);
    if (!RECEIVABLE_STATES.includes(order.state)) {
      throw new ConflictException(
        'Seul un bon de commande confirmé peut être réceptionné',
      );
    }
    const quantities = this.aggregateIndexes(order, dto.lines);

    const filter: Record<string, unknown> = {
      _id: order._id,
      state: { $in: RECEIVABLE_STATES },
    };
    const inc: Record<string, number> = {};
    for (const [index, qty] of quantities) {
      const line = order.lines[index];
      const remaining = roundQty(line.quantity - (line.received_qty ?? 0));
      if (qty > remaining) {
        throw new BadRequestException(
          `Ligne ${index + 1} (« ${line.description} ») : ${qty} reçu(s) pour ${remaining} restant(s) à recevoir`,
        );
      }
      filter[`lines.${index}.received_qty`] = line.received_qty ?? 0;
      inc[`lines.${index}.received_qty`] = qty;
    }
    const claimed = (await this.orderModel
      .findOneAndUpdate(filter, { $inc: inc }, { new: true })
      .exec()) as unknown as PurchaseOrder | null;
    if (!claimed) throw this.stateChanged();

    const propertyId = String(order.property_id);
    const moves: string[] = [];
    const warnings: string[] = [];
    for (const [index, qty] of quantities) {
      const line = order.lines[index];
      if (!line.product_id) continue;
      const product = await this.inventory.findProduct(String(line.product_id));
      if (!product || product.product_type === ProductType.SERVICE) continue;
      try {
        const move = await this.inventory.receive(
          String(line.product_id),
          qty,
          line.unit_price,
          propertyId,
          { model: PurchaseOrder.name, id: String(order._id) },
          { actorId, notes: `Réception ${order.number}` },
        );
        moves.push(String(move._id));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        warnings.push(`Ligne ${index + 1} : ${message}`);
        this.logger.error(
          `Entrée en stock impossible pour ${order.number} ligne ${index + 1} : ${message}`,
        );
      }
    }

    const state = computeReceiptState(claimed.lines);
    const updated =
      (await this.orderModel
        .findOneAndUpdate(
          { _id: order._id, state: { $in: RECEIVABLE_STATES } },
          {
            $set: {
              state,
              ...(state === PurchaseOrderState.RECEIVED
                ? { received_at: new Date() }
                : {}),
            },
          },
          { new: true },
        )
        .exec()) ?? claimed;

    await this.publish(DomainEvents.PURCHASE_ORDER_RECEIVED, updated, actorId, {
      fully_received: updated.state === PurchaseOrderState.RECEIVED,
      received_lines: [...quantities].map(([index, qty]) => ({
        line_index: index,
        product_id: order.lines[index].product_id
          ? String(order.lines[index].product_id)
          : null,
        quantity: qty,
        unit_price: order.lines[index].unit_price,
      })),
      stock_move_ids: moves,
    });
    return { order: updated, moves, warnings };
  }

  /**
   * Réapprovisionnement intelligent : ajoute l'article au brouillon
   * automatique du fournisseur (créé au besoin), sans jamais dupliquer
   * une ligne pour le même article.
   */
  async addReorderLine(
    payload: StockLowPayload,
    vendorId: string,
    quantity: number,
    unitPrice: number,
  ): Promise<{ outcome: ReorderOutcome; order?: PurchaseOrder }> {
    if (quantity <= 0) return { outcome: 'nothing_to_order' };
    const vendor = await this.vendors.getForProperty(
      vendorId,
      payload.property_id,
    );
    if (!vendor.is_active) return { outcome: 'nothing_to_order' };
    const vendorOid = new Types.ObjectId(vendorId);
    const property = new Types.ObjectId(payload.property_id);
    const productId = new Types.ObjectId(payload.product_id);
    const draftFilter = {
      property_id: property,
      vendor_id: vendorOid,
      state: PurchaseOrderState.DRAFT,
      is_system_generated: true,
      is_deleted: { $ne: true },
    };
    const line: PurchaseOrderLine = {
      product_id: productId,
      description: payload.product_name,
      quantity: roundQty(quantity),
      unit_price: roundMoney(unitPrice),
      tax_rate: 0,
      received_qty: 0,
      billed_qty: 0,
      ...computeLineAmounts({ quantity, unit_price: unitPrice, tax_rate: 0 }),
    };

    let order = (await this.orderModel
      .findOne(draftFilter)
      .lean()
      .exec()) as unknown as PurchaseOrder | null;
    let outcome: ReorderOutcome = 'added_line';
    if (!order) {
      const number = await this.sequences.next(ORDER_SEQUENCE, {
        prefix: 'BC',
        scopeId: payload.property_id,
      });
      try {
        const created = await this.orderModel.create({
          property_id: property,
          vendor_id: vendorOid,
          number,
          order_date: new Date(),
          currency: vendor.currency,
          lines: [line],
          ...computeTotals([line]),
          state: PurchaseOrderState.DRAFT,
          is_system_generated: true,
          notes: 'Brouillon créé automatiquement (stock bas)',
        });
        return {
          outcome: 'created_order',
          order: created as unknown as PurchaseOrder,
        };
      } catch (error) {
        if (!isDuplicateKeyError(error)) throw error;
        order = await this.orderModel.findOne(draftFilter).lean().exec();
        if (!order) throw error;
      }
    }

    const pushed = (await this.orderModel
      .findOneAndUpdate(
        {
          _id: order._id,
          state: PurchaseOrderState.DRAFT,
          'lines.product_id': { $ne: productId },
        },
        { $push: { lines: line } },
        { new: true },
      )
      .exec()) as unknown as PurchaseOrder | null;
    if (!pushed) {
      outcome = 'already_present';
      return { outcome, order };
    }
    const totals = computeTotals(pushed.lines);
    const updated = await this.orderModel
      .findByIdAndUpdate(pushed._id, { $set: totals }, { new: true })
      .exec();
    return { outcome, order: updated ?? pushed };
  }

  /** Quantités en commande non encore reçues, par article. */
  async incomingByProduct(propertyId: string): Promise<Map<string, number>> {
    const rows = (await this.orderModel
      .aggregate([
        {
          $match: {
            property_id: new Types.ObjectId(propertyId),
            state: { $in: OPEN_ORDER_STATES },
            is_deleted: { $ne: true },
          },
        },
        { $unwind: '$lines' },
        { $match: { 'lines.product_id': { $exists: true, $ne: null } } },
        {
          $group: {
            _id: '$lines.product_id',
            qty: {
              $sum: {
                $max: [
                  0,
                  { $subtract: ['$lines.quantity', '$lines.received_qty'] },
                ],
              },
            },
          },
        },
      ])
      .exec()) as Array<{ _id: Types.ObjectId; qty: number }>;
    return new Map(rows.map((r) => [String(r._id), roundQty(r.qty)]));
  }

  /** Recalcule le statut de facturation après création/annulation d'une facture. */
  async refreshBillingStatus(orderId: Types.ObjectId | string): Promise<void> {
    const order = (await this.orderModel
      .findById(orderId)
      .lean()
      .exec()) as unknown as PurchaseOrder | null;
    if (!order) return;
    await this.orderModel
      .updateOne(
        { _id: order._id },
        { $set: { billing_status: computeBillingStatus(order.lines) } },
      )
      .exec();
  }

  // ---------------------------------------------------------------------------

  /** Construit les lignes (description par défaut, montants). */
  private async buildLines(
    propertyId: string,
    lines: PurchaseLineDto[],
  ): Promise<PurchaseOrderLine[]> {
    const built: PurchaseOrderLine[] = [];
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
        received_qty: 0,
        billed_qty: 0,
        ...computeLineAmounts(base),
      });
    }
    return built;
  }

  /** Regroupe les quantités par index de ligne et contrôle les index. */
  private aggregateIndexes(
    order: PurchaseOrder,
    lines: Array<{ line_index: number; quantity: number }>,
  ): Map<number, number> {
    const quantities = new Map<number, number>();
    for (const l of lines) {
      if (l.line_index >= order.lines.length) {
        throw new BadRequestException(`Ligne ${l.line_index + 1} inexistante`);
      }
      quantities.set(
        l.line_index,
        roundQty((quantities.get(l.line_index) ?? 0) + l.quantity),
      );
    }
    return quantities;
  }

  private assertHasLines(order: PurchaseOrder) {
    if (!order.lines?.length) {
      throw new BadRequestException(
        'Le bon de commande ne contient aucune ligne',
      );
    }
  }

  private async transition(
    order: PurchaseOrder,
    from: PurchaseOrderState[],
    set: Record<string, unknown>,
  ): Promise<PurchaseOrder> {
    const updated = await this.orderModel
      .findOneAndUpdate(
        { _id: order._id, state: { $in: from } },
        { $set: set },
        { new: true },
      )
      .exec();
    if (!updated) throw this.stateChanged();
    return updated;
  }

  private stateChanged() {
    return new ConflictException(
      'Le bon de commande a changé ; veuillez actualiser puis réessayer',
    );
  }

  private async publish(
    name: DomainEventName,
    order: PurchaseOrder,
    actorId?: string,
    extra: Record<string, unknown> = {},
  ) {
    if (!this.events) return;
    const payload = { ...toEventPayload(order), ...extra };
    await this.events.publish(name, {
      property_id: String(order.property_id),
      actor_id: actorId,
      record: { model: PurchaseOrder.name, id: String(order._id) },
      payload,
    });
  }
}
