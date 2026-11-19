import {
  BadRequestException,
  Injectable,
  Optional,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage, QueryFilter, Types } from 'mongoose';
import { randomBytes } from 'crypto';
import { BaseCrudService } from '../../common/services/base-crud.service';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { PosItemService } from '../../pos-item/services/pos-item.service';
import { PosItem } from '../../pos-item/schemas/pos-item.entity';
import {
  PosSettlementType,
  PosTransaction,
  PosTransactionDocument,
  PosTransactionLine,
  PosTransactionStatus,
} from '../schemas/pos-transaction.entity';
import { CreatePosTransactionDto } from '../dto/create-pos-transaction.dto';
import { UpdatePosTransactionDto } from '../dto/update-pos-transaction.dto';
import {
  PosTransactionQueryDto,
  RefundPosTransactionDto,
} from '../dto/pos-transaction-actions.dto';
import {
  DomainEventPublisher,
  publishRecordEvent,
} from '../../platform/events/domain-event.publisher';
import {
  DomainEventName,
  DomainEvents,
} from '../../platform/events/domain-events';

/** Rapport des ventes journalières d'un établissement. */
export interface PosDailySales {
  property_id: string;
  date: Date;
  currency: string;
  transaction_count: number;
  voided_count: number;
  gross_sales: number;
  discount_total: number;
  tax_total: number;
  refunds: number;
  net_sales: number;
  by_outlet: Record<string, { quantity: number; revenue: number }>;
  by_settlement: Record<string, number>;
  by_payment_method: Record<string, number>;
}

/** Charges chambre non encore reportées sur facture. */
export interface PosRoomCharges {
  reservation_id: string;
  count: number;
  total: number;
  transactions: PosTransaction[];
}

/** Ligne du classement des articles les plus vendus. */
export interface PosTopSellingItem {
  item_id: Types.ObjectId;
  name: string;
  category: string;
  quantity: number;
  revenue: number;
}

/** Statuts comptant dans le chiffre d'affaires. */
const REVENUE_STATUSES = [
  PosTransactionStatus.COMPLETED,
  PosTransactionStatus.PARTIALLY_REFUNDED,
  PosTransactionStatus.REFUNDED,
];

/**
 * Service des transactions de point de vente.
 *
 * Une transaction est enregistrée à l'état `completed` après décrément
 * atomique du stock de chaque article ; en cas d'échec (stock insuffisant,
 * article introuvable…) les décréments déjà effectués sont annulés.
 */
@Injectable()
export class PosTransactionService extends BaseCrudService<
  PosTransaction,
  CreatePosTransactionDto,
  UpdatePosTransactionDto
> {
  private readonly logger = new Logger(PosTransactionService.name);

  constructor(
    @InjectModel(PosTransaction.name)
    protected readonly transactionModel: Model<PosTransaction>,
    private readonly posItemService: PosItemService,
    @Optional() private readonly events?: DomainEventPublisher,
  ) {
    super(transactionModel, PosTransaction.name);
  }

  /**
   * Enregistre une vente : calcule les montants à partir du catalogue,
   * décrémente les stocks puis persiste la transaction.
   */
  async create(dto: CreatePosTransactionDto): Promise<PosTransaction> {
    this.assertSettlement(dto);

    // Chargement des articles (une seule fois par article)
    const itemIds = [...new Set(dto.items.map((l) => l.item_id))];
    const catalog = new Map<string, PosItem>();
    for (const itemId of itemIds) {
      const item = await this.posItemService.findActiveOrFail(itemId);
      if (item.property_id?.toString() !== dto.property_id) {
        throw new BadRequestException(
          `L'article « ${item.name} » n'appartient pas à cet établissement`,
        );
      }
      catalog.set(itemId, item);
    }

    const currencies = new Set(
      [...catalog.values()].map((i) => i.price?.currency ?? 'XOF'),
    );
    if (currencies.size > 1) {
      throw new BadRequestException(
        'Tous les articles d’une transaction doivent être dans la même devise',
      );
    }
    const currency = [...currencies][0] as string;

    const lines = dto.items.map((l) =>
      this.buildLine(catalog.get(l.item_id)!, l.quantity, l.discount ?? 0),
    );
    const totals = this.computeTotals(lines);

    // Décrément atomique des stocks, avec compensation en cas d'échec
    const quantities = new Map<string, number>();
    for (const l of dto.items) {
      quantities.set(l.item_id, (quantities.get(l.item_id) ?? 0) + l.quantity);
    }
    const decremented: Array<[string, number]> = [];
    try {
      for (const [itemId, qty] of quantities) {
        await this.posItemService.decrementStock(itemId, qty);
        decremented.push([itemId, qty]);
      }

      return await this.emitted(
        DomainEvents.POS_TRANSACTION_COMPLETED,
        super.create({
          ...dto,
          items: lines,
          currency,
          ...totals,
          transaction_number: this.generateTransactionNumber(),
          status: PosTransactionStatus.COMPLETED,
          transaction_date: dto.transaction_date
            ? new Date(dto.transaction_date)
            : new Date(),
        } as unknown as CreatePosTransactionDto),
      );
    } catch (error) {
      await this.restock(decremented);
      throw error;
    }
  }

  /** Liste paginée avec filtres métier. */
  async findAll(
    query: PosTransactionQueryDto,
    filter: QueryFilter<PosTransaction> = {},
  ): Promise<PaginatedResult<PosTransaction>> {
    const criteria: Record<string, unknown> = { ...filter };
    if (query.property_id) {
      criteria.property_id = new Types.ObjectId(query.property_id);
    }
    if (query.status) criteria.status = query.status;
    if (query.settlement_type) criteria.settlement_type = query.settlement_type;
    if (query.outlet) criteria.outlet = query.outlet;
    if (query.from || query.to) {
      const range: Record<string, Date> = {};
      if (query.from) range.$gte = new Date(query.from);
      if (query.to) range.$lte = new Date(query.to);
      criteria.transaction_date = range;
    }
    if (query.search) {
      criteria.transaction_number = query.search.trim().toUpperCase();
    }
    return super.findAll(query, criteria as QueryFilter<PosTransaction>);
  }

  /** Recherche une transaction par son numéro. */
  async findByNumber(transactionNumber: string): Promise<PosTransaction> {
    return this.findOneOrFail({
      transaction_number: transactionNumber.trim().toUpperCase(),
    } as QueryFilter<PosTransaction>);
  }

  /** Transactions d'une réservation. */
  findByReservation(reservationId: string, query: PaginationQueryDto) {
    return super.findAll(query, {
      reservation_id: new Types.ObjectId(reservationId),
    } as QueryFilter<PosTransaction>);
  }

  /** Transactions d'un client. */
  findByGuest(guestId: string, query: PaginationQueryDto) {
    return super.findAll(query, {
      guest_id: new Types.ObjectId(guestId),
    } as QueryFilter<PosTransaction>);
  }

  /** Charges chambre d'une réservation non encore reportées sur facture. */
  async getRoomCharges(reservationId: string): Promise<PosRoomCharges> {
    const transactions = (await this.transactionModel
      .find({
        reservation_id: new Types.ObjectId(reservationId),
        settlement_type: PosSettlementType.ROOM_CHARGE,
        status: {
          $in: [
            PosTransactionStatus.COMPLETED,
            PosTransactionStatus.PARTIALLY_REFUNDED,
          ],
        },
        is_settled: { $ne: true },
        is_deleted: { $ne: true },
      })
      .sort({ transaction_date: 1 })
      .lean()
      .exec()) as unknown as PosTransaction[];

    const total = transactions.reduce(
      (sum, t) => sum + (t.total - (t.refunded_amount ?? 0)),
      0,
    );
    return {
      reservation_id: reservationId,
      count: transactions.length,
      total: this.round(total),
      transactions,
    };
  }

  /**
   * Annule une transaction : remet les articles en stock.
   * Impossible si déjà annulée, remboursée ou déjà reportée sur facture.
   */
  async void(id: string, reason: string): Promise<PosTransaction> {
    const trx = await this.findOne(id);
    if (trx.status === PosTransactionStatus.VOIDED) {
      throw new BadRequestException('Cette transaction est déjà annulée');
    }
    if (trx.status !== PosTransactionStatus.COMPLETED) {
      throw new BadRequestException(
        'Une transaction remboursée ne peut pas être annulée',
      );
    }
    if (trx.is_settled) {
      throw new BadRequestException(
        'Cette charge a déjà été reportée sur une facture : effectuer un remboursement',
      );
    }

    const updated = (await this.transactionModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), status: PosTransactionStatus.COMPLETED },
        {
          status: PosTransactionStatus.VOIDED,
          voided_at: new Date(),
          void_reason: reason,
        },
        { new: true },
      )
      .exec()) as unknown as PosTransaction | null;
    if (!updated) {
      throw new BadRequestException(
        'La transaction a été modifiée entre-temps, veuillez réessayer',
      );
    }

    await this.restock(this.quantitiesOf(trx.items));
    return this.emitted(DomainEvents.POS_TRANSACTION_VOIDED, updated);
  }

  /**
   * Rembourse tout ou partie d'une transaction.
   * Le remboursement total peut remettre les articles en stock.
   */
  async refund(
    id: string,
    dto: RefundPosTransactionDto = {},
  ): Promise<PosTransaction> {
    const trx = await this.findOne(id);
    if (
      trx.status !== PosTransactionStatus.COMPLETED &&
      trx.status !== PosTransactionStatus.PARTIALLY_REFUNDED
    ) {
      throw new BadRequestException(
        `Impossible de rembourser une transaction au statut « ${trx.status} »`,
      );
    }

    const alreadyRefunded = trx.refunded_amount ?? 0;
    const remaining = this.round(trx.total - alreadyRefunded);
    const amount = this.round(dto.amount ?? remaining);
    if (amount <= 0 || amount > remaining) {
      throw new BadRequestException(
        `Montant de remboursement invalide (restant remboursable : ${remaining})`,
      );
    }

    const refunded = this.round(alreadyRefunded + amount);
    const fullyRefunded = refunded >= trx.total;

    const updated = (await this.transactionModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(id),
          status: trx.status,
          refunded_amount: alreadyRefunded,
        },
        {
          status: fullyRefunded
            ? PosTransactionStatus.REFUNDED
            : PosTransactionStatus.PARTIALLY_REFUNDED,
          refunded_amount: refunded,
          refunded_at: new Date(),
          refund_reason: dto.reason,
        },
        { new: true },
      )
      .exec()) as unknown as PosTransaction | null;
    if (!updated) {
      throw new BadRequestException(
        'La transaction a été modifiée entre-temps, veuillez réessayer',
      );
    }

    if (fullyRefunded && dto.restock) {
      await this.restock(this.quantitiesOf(trx.items));
    }
    return updated;
  }

  /** Marque une charge chambre comme reportée sur une facture. */
  async settle(id: string, invoiceId: string): Promise<PosTransaction> {
    const trx = await this.findOne(id);
    if (trx.settlement_type !== PosSettlementType.ROOM_CHARGE) {
      throw new BadRequestException(
        'Seules les charges chambre peuvent être reportées sur une facture',
      );
    }
    if (trx.status === PosTransactionStatus.VOIDED) {
      throw new BadRequestException('Cette transaction est annulée');
    }
    if (trx.is_settled) {
      throw new BadRequestException(
        'Cette charge est déjà reportée sur une facture',
      );
    }
    return super.update(id, {
      is_settled: true,
      invoice_id: new Types.ObjectId(invoiceId),
    } as unknown as UpdatePosTransactionDto);
  }

  /** Seules les transactions annulées peuvent être supprimées. */
  async remove(id: string): Promise<PosTransaction> {
    const trx = await this.findOne(id);
    if (trx.status !== PosTransactionStatus.VOIDED) {
      throw new BadRequestException(
        'Seule une transaction annulée peut être supprimée',
      );
    }
    return super.remove(id);
  }

  /** Rapport des ventes d'une journée (par point de vente, mode de règlement…). */
  async getDailySales(propertyId: string, date?: Date): Promise<PosDailySales> {
    const target = date ?? new Date();
    if (Number.isNaN(target.getTime())) {
      throw new BadRequestException('Date invalide');
    }
    const start = new Date(target);
    start.setHours(0, 0, 0, 0);
    const end = new Date(target);
    end.setHours(23, 59, 59, 999);

    const transactions = (await this.transactionModel
      .find({
        property_id: new Types.ObjectId(propertyId),
        transaction_date: { $gte: start, $lte: end },
        is_deleted: { $ne: true },
      })
      .lean()
      .exec()) as unknown as PosTransaction[];

    const report: PosDailySales = {
      property_id: propertyId,
      date: start,
      currency: transactions[0]?.currency ?? 'XOF',
      transaction_count: 0,
      voided_count: 0,
      gross_sales: 0,
      discount_total: 0,
      tax_total: 0,
      refunds: 0,
      net_sales: 0,
      by_outlet: {},
      by_settlement: {},
      by_payment_method: {},
    };

    for (const t of transactions) {
      if (t.status === PosTransactionStatus.VOIDED) {
        report.voided_count++;
        continue;
      }
      if (!REVENUE_STATUSES.includes(t.status)) continue;

      report.transaction_count++;
      report.gross_sales += t.total;
      report.discount_total += t.discount_total ?? 0;
      report.tax_total += t.tax_total ?? 0;
      report.refunds += t.refunded_amount ?? 0;

      report.by_settlement[t.settlement_type] =
        (report.by_settlement[t.settlement_type] ?? 0) + t.total;
      const method = t.payment_method ?? t.settlement_type;
      report.by_payment_method[method] =
        (report.by_payment_method[method] ?? 0) + t.total;

      for (const line of t.items ?? []) {
        const bucket = (report.by_outlet[line.category] ??= {
          quantity: 0,
          revenue: 0,
        });
        bucket.quantity += line.quantity;
        bucket.revenue = this.round(bucket.revenue + line.total);
      }
    }

    report.gross_sales = this.round(report.gross_sales);
    report.discount_total = this.round(report.discount_total);
    report.tax_total = this.round(report.tax_total);
    report.refunds = this.round(report.refunds);
    report.net_sales = this.round(report.gross_sales - report.refunds);
    return report;
  }

  /** Articles les plus vendus sur une période (quantité décroissante). */
  async getTopSellingItems(
    propertyId: string,
    from?: Date,
    to?: Date,
    limit = 10,
  ): Promise<PosTopSellingItem[]> {
    if (from && to && from > to) {
      throw new BadRequestException(
        'La date de début doit précéder la date de fin',
      );
    }
    const match: Record<string, unknown> = {
      property_id: new Types.ObjectId(propertyId),
      status: { $in: REVENUE_STATUSES },
      is_deleted: { $ne: true },
    };
    if (from || to) {
      const range: Record<string, Date> = {};
      if (from) range.$gte = from;
      if (to) range.$lte = to;
      match.transaction_date = range;
    }

    const pipeline: PipelineStage[] = [
      { $match: match },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.item_id',
          name: { $last: '$items.name' },
          category: { $last: '$items.category' },
          quantity: { $sum: '$items.quantity' },
          revenue: { $sum: '$items.total' },
        },
      },
      { $sort: { quantity: -1, revenue: -1 } },
      { $limit: limit },
      {
        $project: {
          _id: 0,
          item_id: '$_id',
          name: 1,
          category: 1,
          quantity: 1,
          revenue: 1,
        },
      },
    ];
    return this.transactionModel.aggregate<PosTopSellingItem>(pipeline).exec();
  }

  /** Construit une ligne de vente figée à partir du catalogue. */
  private buildLine(
    item: PosItem,
    quantity: number,
    discount: number,
  ): PosTransactionLine {
    const unitPrice = item.price?.amount ?? 0;
    const gross = this.round(unitPrice * quantity);
    if (discount > gross) {
      throw new BadRequestException(
        `La remise sur « ${item.name} » dépasse le montant de la ligne`,
      );
    }
    const taxRate = item.tax_rate ?? 0;
    const taxable = this.round(gross - discount);
    const taxAmount = this.round((taxable * taxRate) / 100);
    return {
      item_id: item._id,
      name: item.name,
      category: item.category,
      quantity,
      unit_price: unitPrice,
      tax_rate: taxRate,
      discount,
      tax_amount: taxAmount,
      total: this.round(taxable + taxAmount),
    };
  }

  private computeTotals(lines: PosTransactionLine[]) {
    const subtotal = lines.reduce((s, l) => s + l.unit_price * l.quantity, 0);
    const discount = lines.reduce((s, l) => s + l.discount, 0);
    const tax = lines.reduce((s, l) => s + l.tax_amount, 0);
    const total = lines.reduce((s, l) => s + l.total, 0);
    return {
      subtotal: this.round(subtotal),
      discount_total: this.round(discount),
      tax_total: this.round(tax),
      total: this.round(total),
    };
  }

  private assertSettlement(dto: CreatePosTransactionDto): void {
    if (
      dto.settlement_type === PosSettlementType.ROOM_CHARGE &&
      !dto.reservation_id
    ) {
      throw new BadRequestException(
        'Une imputation sur chambre nécessite une réservation (reservation_id)',
      );
    }
    if (
      dto.settlement_type === PosSettlementType.DIRECT &&
      !dto.payment_method
    ) {
      throw new BadRequestException(
        'Un paiement direct nécessite un moyen de paiement (payment_method)',
      );
    }
  }

  private quantitiesOf(lines: PosTransactionLine[]): Array<[string, number]> {
    const map = new Map<string, number>();
    for (const l of lines ?? []) {
      const key = l.item_id.toString();
      map.set(key, (map.get(key) ?? 0) + l.quantity);
    }
    return [...map];
  }

  /** Remet en stock ; les erreurs sont journalisées sans interrompre. */
  private async restock(entries: Array<[string, number]>): Promise<void> {
    for (const [itemId, qty] of entries) {
      try {
        await this.posItemService.incrementStock(itemId, qty);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Échec de remise en stock de l'article ${itemId} (${qty}) : ${message}`,
        );
      }
    }
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private generateTransactionNumber(): string {
    const suffix = randomBytes(3).toString('hex').toUpperCase();
    return `POS-${Date.now()}-${suffix}`;
  }
  /** Publie l'événement métier correspondant puis renvoie le document. */
  private async emitted<R>(
    name: DomainEventName,
    result: R | Promise<R>,
  ): Promise<R> {
    const doc = await result;
    await publishRecordEvent(this.events, name, PosTransaction.name, doc);
    return doc;
  }
}
