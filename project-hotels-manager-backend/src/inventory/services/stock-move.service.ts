import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types } from 'mongoose';
import { BaseCrudService } from '../../common/services/base-crud.service';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { SequenceService } from '../../platform/sequences/sequence.service';
import { DomainEventPublisher } from '../../platform/events/domain-event.publisher';
import { DomainEvents } from '../../platform/events/domain-events';
import { StockMove, StockMoveOrigin } from '../schemas/stock-move.entity';
import { StockQuant } from '../schemas/stock-quant.entity';
import { Product } from '../schemas/product.entity';
import { StockLocation } from '../schemas/stock-location.entity';
import {
  CreateStockMoveDto,
  StockMoveQueryDto,
  UpdateStockMoveDto,
} from '../dto/stock-move.dto';
import {
  ProductType,
  StockLocationType,
  StockMoveState,
} from '../inventory.enums';
import {
  crossesBelowThreshold,
  isDuplicateKeyError,
  roundMoney,
  roundQty,
  toObjectId,
  weightedAverageCost,
} from '../inventory.utils';

/** Données internes pour créer un mouvement (origine, idempotence). */
export interface StockMoveInput extends CreateStockMoveDto {
  origin?: StockMoveOrigin;
  idempotency_key?: string;
}

/** Charge utile de `DomainEvents.STOCK_LOW`. */
export interface StockLowPayload {
  product_id: string;
  product_name: string;
  property_id: string;
  quantity_available: number;
  reorder_min: number;
  reorder_max: number;
  preferred_vendor_id: string | null;
}

interface MoveContext {
  product: Product;
  source: StockLocation;
  dest: StockLocation;
}

const MOVE_SEQUENCE = 'inventory.stock_move';

/**
 * Mouvements de stock.
 *
 * Validation (`draft → done`) :
 * 1. le mouvement est « réservé » atomiquement (`findOneAndUpdate` sur
 *    l'état brouillon) : deux validations concurrentes ne s'appliquent
 *    jamais deux fois ;
 * 2. la quantité est retirée de l'emplacement source interne par `$inc`
 *    conditionné à `quantity >= qty` (stock négatif refusé pour les articles
 *    stockables) puis ajoutée à la destination interne ;
 * 3. en cas d'échec, le mouvement repasse en brouillon et les quantités
 *    déjà modifiées sont compensées.
 */
@Injectable()
export class StockMoveService extends BaseCrudService<
  StockMove,
  CreateStockMoveDto,
  UpdateStockMoveDto
> {
  private readonly logger = new Logger(StockMoveService.name);

  constructor(
    @InjectModel(StockMove.name) protected readonly moveModel: Model<StockMove>,
    @InjectModel(StockQuant.name)
    private readonly quantModel: Model<StockQuant>,
    @InjectModel(Product.name) private readonly productModel: Model<Product>,
    @InjectModel(StockLocation.name)
    private readonly locationModel: Model<StockLocation>,
    private readonly sequences: SequenceService,
    @Optional() private readonly events?: DomainEventPublisher,
  ) {
    super(moveModel, StockMove.name);
  }

  /** Crée un mouvement brouillon (sans effet sur les quantités). */
  async create(dto: StockMoveInput, actorId?: string): Promise<StockMove> {
    const ctx = await this.loadContext(
      dto.property_id,
      dto.product_id,
      dto.source_location_id,
      dto.dest_location_id,
    );
    const reference = await this.sequences.next(MOVE_SEQUENCE, {
      prefix: 'MV',
      scopeId: dto.property_id,
    });
    try {
      return await super.create({
        property_id: new Types.ObjectId(dto.property_id),
        product_id: new Types.ObjectId(dto.product_id),
        source_location_id: new Types.ObjectId(dto.source_location_id),
        dest_location_id: new Types.ObjectId(dto.dest_location_id),
        quantity: roundQty(dto.quantity),
        unit_cost: roundMoney(dto.unit_cost ?? ctx.product.cost_price ?? 0),
        notes: dto.notes,
        origin: dto.origin,
        idempotency_key: dto.idempotency_key,
        reference,
        state: StockMoveState.DRAFT,
        created_by: actorId,
      } as unknown as CreateStockMoveDto);
    } catch (error) {
      if (isDuplicateKeyError(error) && dto.idempotency_key) {
        throw new ConflictException(
          'Ce mouvement a déjà été enregistré (clé d’idempotence)',
        );
      }
      throw error;
    }
  }

  /** Modifie un mouvement brouillon. */
  async update(id: string, dto: UpdateStockMoveDto): Promise<StockMove> {
    const move = await this.findOne(id);
    this.assertDraft(move);
    await this.loadContext(
      String(move.property_id),
      dto.product_id ?? String(move.product_id),
      dto.source_location_id ?? String(move.source_location_id),
      dto.dest_location_id ?? String(move.dest_location_id),
    );
    const set: Record<string, unknown> = {};
    if (dto.product_id) set.product_id = new Types.ObjectId(dto.product_id);
    if (dto.source_location_id) {
      set.source_location_id = new Types.ObjectId(dto.source_location_id);
    }
    if (dto.dest_location_id) {
      set.dest_location_id = new Types.ObjectId(dto.dest_location_id);
    }
    if (dto.quantity !== undefined) set.quantity = roundQty(dto.quantity);
    if (dto.unit_cost !== undefined) set.unit_cost = roundMoney(dto.unit_cost);
    if (dto.notes !== undefined) set.notes = dto.notes;
    const updated = await this.moveModel
      .findOneAndUpdate(
        { _id: move._id, state: StockMoveState.DRAFT },
        { $set: set },
        { new: true, runValidators: true },
      )
      .exec();
    if (!updated) {
      throw new ConflictException(
        "Le mouvement a changé d'état ; veuillez actualiser puis réessayer",
      );
    }
    return updated;
  }

  async findAll(
    query: StockMoveQueryDto,
    filter: QueryFilter<StockMove> = {},
  ): Promise<PaginatedResult<StockMove>> {
    const criteria: Record<string, unknown> = { ...filter };
    if (query.property_id) {
      criteria.property_id = new Types.ObjectId(query.property_id);
    }
    if (query.product_id) {
      criteria.product_id = new Types.ObjectId(query.product_id);
    }
    if (query.location_id) {
      const location = new Types.ObjectId(query.location_id);
      criteria.$or = [
        { source_location_id: location },
        { dest_location_id: location },
      ];
    }
    if (query.state) criteria.state = query.state;
    if (query.origin_model) criteria['origin.model'] = query.origin_model;
    if (query.origin_id) criteria['origin.id'] = query.origin_id;
    if (query.from || query.to) {
      const range: Record<string, Date> = {};
      if (query.from) range.$gte = new Date(query.from);
      if (query.to) range.$lte = new Date(query.to);
      criteria.created_at = range;
    }
    if (query.search) criteria.reference = query.search.trim().toUpperCase();
    return super.findAll(query, criteria);
  }

  /** Seuls les mouvements non validés peuvent être supprimés. */
  async remove(id: string): Promise<StockMove> {
    const move = await this.findOne(id);
    if (move.state === StockMoveState.DONE) {
      throw new ConflictException(
        'Un mouvement validé ne peut pas être supprimé ; créez un mouvement inverse',
      );
    }
    return super.remove(id);
  }

  /** Annule un mouvement brouillon. */
  async cancel(id: string): Promise<StockMove> {
    const move = await this.findOne(id);
    this.assertDraft(move);
    const updated = await this.moveModel
      .findOneAndUpdate(
        { _id: move._id, state: StockMoveState.DRAFT },
        { $set: { state: StockMoveState.CANCELLED } },
        { new: true },
      )
      .exec();
    if (!updated) {
      throw new ConflictException(
        "Le mouvement a changé d'état ; veuillez actualiser puis réessayer",
      );
    }
    return updated;
  }

  /** Valide un mouvement brouillon : met à jour les quantités en stock. */
  async validate(id: string, actorId?: string): Promise<StockMove> {
    const move = await this.findOne(id);
    this.assertDraft(move);
    const ctx = await this.loadContext(
      String(move.property_id),
      String(move.product_id),
      String(move.source_location_id),
      String(move.dest_location_id),
    );

    const claimed = (await this.moveModel
      .findOneAndUpdate(
        {
          _id: move._id,
          state: StockMoveState.DRAFT,
          is_deleted: { $ne: true },
        },
        {
          $set: {
            state: StockMoveState.DONE,
            done_at: new Date(),
            done_by: actorId,
          },
        },
        { new: true },
      )
      .exec()) as unknown as StockMove | null;
    if (!claimed) {
      throw new ConflictException('Ce mouvement a déjà été traité');
    }

    try {
      await this.applyQuants(claimed, ctx);
    } catch (error) {
      await this.moveModel
        .updateOne(
          { _id: claimed._id, state: StockMoveState.DONE },
          {
            $set: { state: StockMoveState.DRAFT },
            $unset: { done_at: 1, done_by: 1 },
          },
        )
        .exec();
      throw error;
    }

    await this.afterDone(claimed, ctx, actorId);
    return claimed;
  }

  /** Crée puis valide un mouvement (réceptions, consommations…). */
  async createAndValidate(
    input: StockMoveInput,
    actorId?: string,
  ): Promise<StockMove> {
    const move = await this.create(input, actorId);
    return this.validate(String(move._id), actorId);
  }

  /** Quantité totale en stock (tous emplacements internes). */
  async getAvailableQuantity(
    productId: string | Types.ObjectId,
  ): Promise<number> {
    const [row] = (await this.quantModel
      .aggregate([
        { $match: { product_id: toObjectId(productId, 'Article') } },
        { $group: { _id: null, total: { $sum: '$quantity' } } },
      ])
      .exec()) as Array<{ total: number }>;
    return roundQty(row?.total ?? 0);
  }

  /** Quantité d'un article dans un emplacement. */
  async getQuantityAt(
    productId: string | Types.ObjectId,
    locationId: string | Types.ObjectId,
  ): Promise<number> {
    const quant = (await this.quantModel
      .findOne({
        product_id: toObjectId(productId, 'Article'),
        location_id: toObjectId(locationId, 'Emplacement'),
      })
      .lean()
      .exec()) as unknown as StockQuant | null;
    return roundQty(quant?.quantity ?? 0);
  }

  // ---------------------------------------------------------------------------

  private assertDraft(move: StockMove) {
    if (move.state !== StockMoveState.DRAFT) {
      throw new ConflictException(
        move.state === StockMoveState.DONE
          ? 'Ce mouvement est déjà validé'
          : 'Ce mouvement est annulé',
      );
    }
  }

  /** Charge et contrôle l'article et les emplacements d'un mouvement. */
  private async loadContext(
    propertyId: string,
    productId: string,
    sourceId: string,
    destId: string,
  ): Promise<MoveContext> {
    const property = toObjectId(propertyId, 'Établissement');
    if (String(sourceId) === String(destId)) {
      throw new BadRequestException(
        "L'emplacement source et la destination doivent être différents",
      );
    }
    const [product, source, dest] = (await Promise.all([
      this.productModel
        .findOne({
          _id: toObjectId(productId, 'Article'),
          is_deleted: { $ne: true },
        })
        .lean()
        .exec(),
      this.locationModel
        .findOne({
          _id: toObjectId(sourceId, 'Emplacement source'),
          is_deleted: { $ne: true },
        })
        .lean()
        .exec(),
      this.locationModel
        .findOne({
          _id: toObjectId(destId, 'Emplacement de destination'),
          is_deleted: { $ne: true },
        })
        .lean()
        .exec(),
    ])) as unknown as [
      Product | null,
      StockLocation | null,
      StockLocation | null,
    ];

    if (!product) throw new NotFoundException('Article introuvable');
    if (!source) throw new NotFoundException('Emplacement source introuvable');
    if (!dest) {
      throw new NotFoundException('Emplacement de destination introuvable');
    }
    for (const [label, doc] of [
      ["L'article", product],
      ["L'emplacement source", source],
      ["L'emplacement de destination", dest],
    ] as const) {
      if (!property.equals(doc.property_id)) {
        throw new BadRequestException(
          `${label} n'appartient pas à cet établissement`,
        );
      }
    }
    if (product.product_type === ProductType.SERVICE) {
      throw new BadRequestException(
        `« ${product.name} » est un service : il ne peut pas être stocké`,
      );
    }
    return { product, source, dest };
  }

  /** Applique un mouvement aux quantités (emplacements internes seulement). */
  private async applyQuants(move: StockMove, ctx: MoveContext): Promise<void> {
    const qty = move.quantity;
    const sourceInternal =
      ctx.source.location_type === StockLocationType.INTERNAL;
    const destInternal = ctx.dest.location_type === StockLocationType.INTERNAL;

    if (sourceInternal) {
      if (ctx.product.product_type === ProductType.STOCKABLE) {
        const updated = await this.quantModel
          .findOneAndUpdate(
            {
              product_id: move.product_id,
              location_id: move.source_location_id,
              quantity: { $gte: qty },
            },
            { $inc: { quantity: -qty } },
            { new: true },
          )
          .exec();
        if (!updated) {
          const available = await this.getQuantityAt(
            move.product_id,
            move.source_location_id,
          );
          throw new BadRequestException(
            `Stock insuffisant pour « ${ctx.product.name} » dans « ${ctx.source.name} » : ${available} disponible(s), ${qty} demandé(s)`,
          );
        }
      } else {
        await this.incrementQuant(move, move.source_location_id, -qty);
      }
    }

    if (destInternal) {
      try {
        await this.incrementQuant(move, move.dest_location_id, qty);
      } catch (error) {
        if (sourceInternal) {
          await this.incrementQuant(move, move.source_location_id, qty);
        }
        throw error;
      }
    }
  }

  /** `$inc` avec création du quant au besoin (une relance si course). */
  private async incrementQuant(
    move: StockMove,
    locationId: Types.ObjectId,
    delta: number,
  ): Promise<void> {
    const run = () =>
      this.quantModel
        .updateOne(
          { product_id: move.product_id, location_id: locationId },
          {
            $inc: { quantity: delta },
            $setOnInsert: { property_id: move.property_id },
          },
          { upsert: true },
        )
        .exec();
    try {
      await run();
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error;
      await run();
    }
  }

  /** Coût moyen, événements et alerte de stock bas après validation. */
  private async afterDone(
    move: StockMove,
    ctx: MoveContext,
    actorId?: string,
  ): Promise<void> {
    const sourceInternal =
      ctx.source.location_type === StockLocationType.INTERNAL;
    const destInternal = ctx.dest.location_type === StockLocationType.INTERNAL;
    const tracksTotal = sourceInternal !== destInternal;
    const available = tracksTotal
      ? await this.getAvailableQuantity(move.product_id)
      : undefined;

    // Réception fournisseur : coût moyen pondéré.
    if (
      ctx.source.location_type === StockLocationType.VENDOR &&
      destInternal &&
      available !== undefined
    ) {
      const newCost = weightedAverageCost(
        available - move.quantity,
        ctx.product.cost_price ?? 0,
        move.quantity,
        move.unit_cost ?? 0,
      );
      if (newCost !== ctx.product.cost_price) {
        await this.productModel
          .updateOne(
            { _id: ctx.product._id },
            { $set: { cost_price: newCost } },
          )
          .exec();
      }
    }

    const propertyId = String(move.property_id);
    await this.events?.publish(DomainEvents.STOCK_MOVE_DONE, {
      property_id: propertyId,
      actor_id: actorId,
      record: { model: StockMove.name, id: String(move._id) },
      payload: {
        _id: String(move._id),
        reference: move.reference,
        property_id: propertyId,
        product_id: String(move.product_id),
        product_name: ctx.product.name,
        product_category: ctx.product.category,
        quantity: move.quantity,
        unit_cost: move.unit_cost,
        value: roundMoney(move.quantity * (move.unit_cost ?? 0)),
        currency: ctx.product.currency,
        source_location_id: String(move.source_location_id),
        source_location_type: ctx.source.location_type,
        dest_location_id: String(move.dest_location_id),
        dest_location_type: ctx.dest.location_type,
        origin: move.origin ?? null,
        done_at: move.done_at?.toISOString?.() ?? new Date().toISOString(),
      },
    });

    // Sortie de stock : alerte au franchissement du seuil minimum.
    if (
      sourceInternal &&
      !destInternal &&
      available !== undefined &&
      ctx.product.product_type === ProductType.STOCKABLE &&
      crossesBelowThreshold(
        available + move.quantity,
        available,
        ctx.product.reorder_min ?? 0,
      )
    ) {
      const payload: StockLowPayload = {
        product_id: String(ctx.product._id),
        product_name: ctx.product.name,
        property_id: propertyId,
        quantity_available: available,
        reorder_min: ctx.product.reorder_min ?? 0,
        reorder_max: ctx.product.reorder_max ?? 0,
        preferred_vendor_id: ctx.product.preferred_vendor_id
          ? String(ctx.product.preferred_vendor_id)
          : null,
      };
      this.logger.log(
        `Stock bas : ${ctx.product.name} (${available} < ${payload.reorder_min})`,
      );
      await this.events?.publish(DomainEvents.STOCK_LOW, {
        property_id: propertyId,
        actor_id: actorId,
        record: { model: Product.name, id: payload.product_id },
        payload,
      });
    }
  }
}
