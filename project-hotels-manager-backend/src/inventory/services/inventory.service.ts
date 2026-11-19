import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Product } from '../schemas/product.entity';
import { StockQuant } from '../schemas/stock-quant.entity';
import { StockMove, StockMoveOrigin } from '../schemas/stock-move.entity';
import { StockLocation } from '../schemas/stock-location.entity';
import { StockLocationService } from './stock-location.service';
import { StockMoveService } from './stock-move.service';
import {
  DEFAULT_LOCATION_CODES,
  ProductCategory,
  ProductType,
  StockLocationType,
  StockMoveState,
} from '../inventory.enums';
import {
  reorderQuantity,
  roundMoney,
  roundQty,
  toObjectId,
} from '../inventory.utils';
import { StockLevelQueryDto } from '../dto/product.dto';

export interface ReceiveOptions {
  actorId?: string;
  notes?: string;
  idempotencyKey?: string;
}

export interface StockLevelRow {
  product_id: string;
  product_name: string;
  sku?: string;
  category: ProductCategory;
  uom: string;
  location_id: string;
  location_name: string;
  location_code: string;
  quantity: number;
  cost_price: number;
  value: number;
}

export interface BelowReorderRow {
  product_id: string;
  product_name: string;
  sku?: string;
  category: ProductCategory;
  uom: string;
  quantity_available: number;
  reorder_min: number;
  reorder_max: number;
  suggested_qty: number;
  cost_price: number;
  currency: string;
  preferred_vendor_id: string | null;
}

export interface CheckoutConsumptionResult {
  created: number;
  skipped: number;
  failed: number;
}

/**
 * Point d'entrée de l'application Stock pour les autres applications
 * (achats, réception) : configuration, réceptions, consommations, rapports.
 */
@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    @InjectModel(Product.name) private readonly productModel: Model<Product>,
    @InjectModel(StockQuant.name)
    private readonly quantModel: Model<StockQuant>,
    @InjectModel(StockMove.name) private readonly moveModel: Model<StockMove>,
    private readonly locations: StockLocationService,
    private readonly moves: StockMoveService,
  ) {}

  /** Crée les emplacements par défaut (idempotent). */
  setup(propertyId: string): Promise<StockLocation[]> {
    return this.locations.setup(propertyId);
  }

  /**
   * Réception fournisseur : mouvement validé de l'emplacement fournisseurs
   * vers l'emplacement interne par défaut (met à jour le coût moyen).
   */
  async receive(
    productId: string,
    qty: number,
    unitCost: number,
    propertyId: string,
    origin?: StockMoveOrigin,
    options: ReceiveOptions = {},
  ): Promise<StockMove> {
    const [vendor, stock] = await Promise.all([
      this.locations.getDefault(propertyId, StockLocationType.VENDOR),
      this.locations.getDefault(propertyId, StockLocationType.INTERNAL),
    ]);
    return this.moves.createAndValidate(
      {
        property_id: propertyId,
        product_id: productId,
        quantity: qty,
        unit_cost: unitCost,
        source_location_id: String(vendor._id),
        dest_location_id: String(stock._id),
        origin,
        notes: options.notes,
        idempotency_key: options.idempotencyKey,
      },
      options.actorId,
    );
  }

  /** Quantité totale disponible (emplacements internes). */
  getAvailableQuantity(productId: string): Promise<number> {
    return this.moves.getAvailableQuantity(productId);
  }

  /** Charge un article (lean), ou `null`. */
  async findProduct(productId: string): Promise<Product | null> {
    if (!Types.ObjectId.isValid(productId)) return null;
    return await this.productModel
      .findOne({
        _id: new Types.ObjectId(productId),
        is_deleted: { $ne: true },
      })
      .lean()
      .exec();
  }

  /**
   * Consommation automatique au départ d'un client : pour chaque article
   * ayant `consumed_per_checkout > 0`, sortie de l'économat vers la
   * consommation interne. Idempotent (clé réservation + article).
   * Un stock insuffisant laisse le mouvement en brouillon (journalisé).
   */
  async consumeForCheckout(
    propertyId: string,
    reservationId: string,
    rooms: number,
    actorId?: string,
  ): Promise<CheckoutConsumptionResult> {
    const result: CheckoutConsumptionResult = {
      created: 0,
      skipped: 0,
      failed: 0,
    };
    const products = (await this.productModel
      .find({
        property_id: toObjectId(propertyId, 'Établissement'),
        consumed_per_checkout: { $gt: 0 },
        product_type: { $ne: ProductType.SERVICE },
        is_active: { $ne: false },
        is_deleted: { $ne: true },
      })
      .lean()
      .exec()) as unknown as Product[];
    if (products.length === 0) return result;

    const source =
      (await this.locations.getByCode(
        propertyId,
        DEFAULT_LOCATION_CODES.HOUSEKEEPING,
      )) ??
      (await this.locations.getDefault(propertyId, StockLocationType.INTERNAL));
    const dest = await this.locations.getDefault(
      propertyId,
      StockLocationType.CONSUMPTION,
    );

    for (const product of products) {
      const key = `checkout:${reservationId}:${String(product._id)}`;
      let move: StockMove;
      try {
        move = await this.moves.create(
          {
            property_id: propertyId,
            product_id: String(product._id),
            quantity: roundQty(product.consumed_per_checkout * rooms),
            source_location_id: String(source._id),
            dest_location_id: String(dest._id),
            origin: { model: 'Reservation', id: reservationId },
            idempotency_key: key,
            notes: 'Consommation automatique au départ du client',
          },
          actorId,
        );
      } catch (error) {
        if (error instanceof ConflictException) {
          result.skipped += 1;
          continue;
        }
        result.failed += 1;
        this.logger.warn(
          `Consommation au départ non créée (${product.name}) : ${this.message(error)}`,
        );
        continue;
      }
      try {
        await this.moves.validate(String(move._id), actorId);
        result.created += 1;
      } catch (error) {
        result.failed += 1;
        this.logger.warn(
          `Consommation au départ ${move.reference} laissée en brouillon (${product.name}) : ${this.message(error)}`,
        );
      }
    }
    return result;
  }

  // --------------------------------------------------------------- Rapports

  /** Niveaux de stock par article et par emplacement interne. */
  async getStockLevels(query: StockLevelQueryDto): Promise<StockLevelRow[]> {
    const match: Record<string, unknown> = {
      property_id: toObjectId(query.property_id, 'Établissement'),
    };
    if (query.product_id)
      match.product_id = new Types.ObjectId(query.product_id);
    if (query.location_id) {
      match.location_id = new Types.ObjectId(query.location_id);
    }
    const quants = (await this.quantModel
      .find(match)
      .lean()
      .exec()) as unknown as StockQuant[];
    if (quants.length === 0) return [];

    const products = await this.productsById(quants.map((q) => q.product_id));
    const locations = await this.locations.findManyById(
      quants.map((q) => q.location_id),
    );
    const rows: StockLevelRow[] = [];
    for (const quant of quants) {
      const product = products.get(String(quant.product_id));
      const location = locations.get(String(quant.location_id));
      if (!product || !location) continue;
      if (query.category && product.category !== query.category) continue;
      const cost = product.cost_price ?? 0;
      rows.push({
        product_id: String(product._id),
        product_name: product.name,
        sku: product.sku,
        category: product.category,
        uom: product.uom,
        location_id: String(location._id),
        location_name: location.name,
        location_code: location.code,
        quantity: roundQty(quant.quantity),
        cost_price: cost,
        value: roundMoney(quant.quantity * cost),
      });
    }
    return rows.sort(
      (a, b) =>
        a.product_name.localeCompare(b.product_name) ||
        a.location_code.localeCompare(b.location_code),
    );
  }

  /** Valorisation du stock (quantité × coût moyen), par article et catégorie. */
  async getValuation(propertyId: string) {
    const levels = await this.getStockLevels({ property_id: propertyId });
    const byProduct = new Map<
      string,
      {
        product_id: string;
        product_name: string;
        category: ProductCategory;
        quantity: number;
        cost_price: number;
        value: number;
      }
    >();
    for (const row of levels) {
      const entry = byProduct.get(row.product_id) ?? {
        product_id: row.product_id,
        product_name: row.product_name,
        category: row.category,
        quantity: 0,
        cost_price: row.cost_price,
        value: 0,
      };
      entry.quantity = roundQty(entry.quantity + row.quantity);
      entry.value = roundMoney(entry.value + row.value);
      byProduct.set(row.product_id, entry);
    }
    const products = [...byProduct.values()];
    const byCategory: Record<string, number> = {};
    for (const p of products) {
      byCategory[p.category] = roundMoney(
        (byCategory[p.category] ?? 0) + p.value,
      );
    }
    return {
      property_id: propertyId,
      total_value: roundMoney(products.reduce((sum, p) => sum + p.value, 0)),
      by_category: byCategory,
      products,
    };
  }

  /** Synthèse des entrées / sorties validées par article sur une période. */
  async getMovesSummary(
    propertyId: string,
    from?: Date,
    to?: Date,
    productId?: string,
  ) {
    const internalIds = await this.locations.internalLocationIds(propertyId);
    const match: Record<string, unknown> = {
      property_id: toObjectId(propertyId, 'Établissement'),
      state: StockMoveState.DONE,
      is_deleted: { $ne: true },
    };
    if (productId) match.product_id = toObjectId(productId, 'Article');
    if (from || to) {
      const range: Record<string, Date> = {};
      if (from) range.$gte = from;
      if (to) range.$lte = to;
      match.done_at = range;
    }
    const rows = (await this.moveModel
      .aggregate([
        { $match: match },
        {
          $project: {
            product_id: 1,
            quantity: 1,
            value: { $multiply: ['$quantity', '$unit_cost'] },
            incoming: {
              $and: [
                { $in: ['$dest_location_id', internalIds] },
                { $not: [{ $in: ['$source_location_id', internalIds] }] },
              ],
            },
            outgoing: {
              $and: [
                { $in: ['$source_location_id', internalIds] },
                { $not: [{ $in: ['$dest_location_id', internalIds] }] },
              ],
            },
          },
        },
        {
          $group: {
            _id: '$product_id',
            qty_in: { $sum: { $cond: ['$incoming', '$quantity', 0] } },
            value_in: { $sum: { $cond: ['$incoming', '$value', 0] } },
            qty_out: { $sum: { $cond: ['$outgoing', '$quantity', 0] } },
            value_out: { $sum: { $cond: ['$outgoing', '$value', 0] } },
            moves: { $sum: 1 },
          },
        },
      ])
      .exec()) as Array<{
      _id: Types.ObjectId;
      qty_in: number;
      value_in: number;
      qty_out: number;
      value_out: number;
      moves: number;
    }>;
    const products = await this.productsById(rows.map((r) => r._id));
    return rows
      .map((row) => ({
        product_id: String(row._id),
        product_name: products.get(String(row._id))?.name ?? '',
        moves: row.moves,
        qty_in: roundQty(row.qty_in),
        value_in: roundMoney(row.value_in),
        qty_out: roundQty(row.qty_out),
        value_out: roundMoney(row.value_out),
      }))
      .sort((a, b) => a.product_name.localeCompare(b.product_name));
  }

  /** Articles dont le stock total est sous le seuil minimum. */
  async getProductsBelowReorder(
    propertyId: string,
  ): Promise<BelowReorderRow[]> {
    const property = toObjectId(propertyId, 'Établissement');
    const products = (await this.productModel
      .find({
        property_id: property,
        reorder_min: { $gt: 0 },
        product_type: { $ne: ProductType.SERVICE },
        is_active: { $ne: false },
        is_deleted: { $ne: true },
      })
      .lean()
      .exec()) as unknown as Product[];
    if (products.length === 0) return [];

    const totals = (await this.quantModel
      .aggregate([
        {
          $match: {
            property_id: property,
            product_id: { $in: products.map((p) => p._id) },
          },
        },
        { $group: { _id: '$product_id', total: { $sum: '$quantity' } } },
      ])
      .exec()) as Array<{ _id: Types.ObjectId; total: number }>;
    const available = new Map(totals.map((t) => [String(t._id), t.total]));

    return products
      .map((product) => {
        const qty = roundQty(available.get(String(product._id)) ?? 0);
        return {
          product_id: String(product._id),
          product_name: product.name,
          sku: product.sku,
          category: product.category,
          uom: product.uom,
          quantity_available: qty,
          reorder_min: product.reorder_min,
          reorder_max: product.reorder_max,
          suggested_qty: reorderQuantity(
            qty,
            product.reorder_min,
            product.reorder_max,
          ),
          cost_price: product.cost_price ?? 0,
          currency: product.currency,
          preferred_vendor_id: product.preferred_vendor_id
            ? String(product.preferred_vendor_id)
            : null,
        };
      })
      .filter((row) => row.quantity_available < row.reorder_min)
      .sort((a, b) => a.product_name.localeCompare(b.product_name));
  }

  private async productsById(ids: Types.ObjectId[]) {
    const rows = (await this.productModel
      .find({ _id: { $in: ids } })
      .lean()
      .exec()) as unknown as Product[];
    return new Map(rows.map((row) => [String(row._id), row]));
  }

  private message(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
