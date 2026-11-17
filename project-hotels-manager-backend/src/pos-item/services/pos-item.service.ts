import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types } from 'mongoose';
import { BaseCrudService } from '../../common/services/base-crud.service';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import {
  PosCategory,
  PosItem,
  PosItemDocument,
} from '../schemas/pos-item.entity';
import { CreatePosItemDto } from '../dto/create-pos-item.dto';
import { UpdatePosItemDto } from '../dto/update-pos-item.dto';
import { PosItemQueryDto } from '../dto/pos-item-query.dto';

/** Synthèse de l'état des stocks d'un établissement. */
export interface PosInventorySummary {
  property_id: string;
  total_items: number;
  low_stock_count: number;
  out_of_stock_count: number;
  stock_value: number;
  items: Array<PosItem & { is_low_stock: boolean }>;
}

/**
 * Service de gestion du catalogue POS (bar, spa, activités, blanchisserie…)
 * et des stocks associés.
 *
 * Les mouvements de stock sont atomiques (`$inc` conditionné par
 * `stock_quantity >= quantité`) afin d'éviter tout stock négatif en cas de
 * ventes concurrentes.
 */
@Injectable()
export class PosItemService extends BaseCrudService<
  PosItem,
  CreatePosItemDto,
  UpdatePosItemDto
> {
  private readonly logger = new Logger(PosItemService.name);

  constructor(
    @InjectModel(PosItem.name)
    protected readonly posItemModel: Model<PosItem>,
  ) {
    super(posItemModel, PosItem.name);
  }

  /** Crée un article en vérifiant l'unicité du SKU dans l'établissement. */
  async create(createPosItemDto: CreatePosItemDto): Promise<PosItem> {
    if (createPosItemDto.sku) {
      await this.assertSkuAvailable(
        createPosItemDto.property_id,
        createPosItemDto.sku,
      );
    }
    return super.create(createPosItemDto);
  }

  /** Liste paginée avec filtres (établissement, catégorie, actif, recherche). */
  async findAll(
    query: PosItemQueryDto,
    filter: QueryFilter<PosItem> = {},
  ): Promise<PaginatedResult<PosItem>> {
    const criteria: Record<string, unknown> = { ...filter };
    if (query.property_id) {
      criteria.property_id = new Types.ObjectId(query.property_id);
    }
    if (query.category) {
      criteria.category = query.category;
    }
    if (query.is_active !== undefined) {
      criteria.is_active = query.is_active;
    }
    if (query.search) {
      const regex = new RegExp(this.escapeRegex(query.search), 'i');
      criteria.$or = [{ name: regex }, { sku: regex }];
    }
    return super.findAll(query, criteria as QueryFilter<PosItem>);
  }

  /** Met à jour un article (vérifie l'unicité du SKU s'il change). */
  async update(id: string, updatePosItemDto: UpdatePosItemDto) {
    if (updatePosItemDto.sku) {
      const current = await this.findOne(id);
      await this.assertSkuAvailable(
        current.property_id.toString(),
        updatePosItemDto.sku,
        id,
      );
    }
    return super.update(id, updatePosItemDto);
  }

  /**
   * Catalogue des articles vendables d'un établissement : actifs et, pour
   * ceux dont le stock est suivi, disponibles en stock.
   */
  async getCatalog(
    propertyId: string,
    category?: PosCategory,
  ): Promise<PosItem[]> {
    const filter: Record<string, unknown> = {
      property_id: new Types.ObjectId(propertyId),
      is_active: true,
      is_deleted: { $ne: true },
      $or: [{ track_stock: false }, { stock_quantity: { $gt: 0 } }],
    };
    if (category) {
      filter.category = category;
    }
    return this.posItemModel
      .find(filter)
      .sort({ category: 1, name: 1 })
      .lean()
      .exec() as unknown as Promise<PosItem[]>;
  }

  /** Articles dont le stock est inférieur ou égal au seuil d'alerte. */
  async getLowStockItems(propertyId: string): Promise<PosItem[]> {
    return this.posItemModel
      .find({
        property_id: new Types.ObjectId(propertyId),
        track_stock: true,
        is_active: true,
        is_deleted: { $ne: true },
        $expr: { $lte: ['$stock_quantity', '$low_stock_threshold'] },
      })
      .sort({ stock_quantity: 1 })
      .lean()
      .exec() as unknown as Promise<PosItem[]>;
  }

  /** État des stocks (articles suivis) avec valorisation et alertes. */
  async getInventory(propertyId: string): Promise<PosInventorySummary> {
    const items = (await this.posItemModel
      .find({
        property_id: new Types.ObjectId(propertyId),
        track_stock: true,
        is_deleted: { $ne: true },
      })
      .sort({ category: 1, name: 1 })
      .lean()
      .exec()) as unknown as PosItem[];

    let low = 0;
    let out = 0;
    let value = 0;
    const enriched = items.map((item) => {
      const isLow = this.isLowStock(item);
      if (item.stock_quantity <= 0) out++;
      if (isLow) low++;
      const unitValue = item.cost_price ?? item.price?.amount ?? 0;
      value += unitValue * item.stock_quantity;
      return { ...item, is_low_stock: isLow } as PosItem & {
        is_low_stock: boolean;
      };
    });

    return {
      property_id: propertyId,
      total_items: items.length,
      low_stock_count: low,
      out_of_stock_count: out,
      stock_value: Math.round(value * 100) / 100,
      items: enriched,
    };
  }

  /**
   * Ajuste le stock de manière relative (réassort ou sortie manuelle).
   * Lève une 400 si l'article ne suit pas de stock ou si le stock deviendrait
   * négatif.
   */
  async adjustStock(id: string, delta: number): Promise<PosItem> {
    if (!Number.isInteger(delta) || delta === 0) {
      throw new BadRequestException(
        'La variation de stock doit être un entier non nul',
      );
    }
    return delta > 0
      ? this.incrementStock(id, delta)
      : this.decrementStock(id, -delta);
  }

  /** Fixe le stock à une valeur absolue (inventaire physique). */
  async setStock(id: string, quantity: number): Promise<PosItem> {
    if (!Number.isInteger(quantity) || quantity < 0) {
      throw new BadRequestException(
        'La quantité en stock doit être un entier positif ou nul',
      );
    }
    const item = await this.findOne(id);
    this.assertTracksStock(item);
    return super.update(id, {
      stock_quantity: quantity,
    } as unknown as UpdatePosItemDto);
  }

  /**
   * Décrémente atomiquement le stock d'un article.
   * Sans effet (article retourné tel quel) si le stock n'est pas suivi.
   */
  async decrementStock(id: string, quantity: number): Promise<PosItem> {
    this.assertPositiveQuantity(quantity);
    const item = await this.findActiveOrFail(id);
    if (!item.track_stock) {
      return item;
    }

    const updated = (await this.posItemModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(id),
          is_deleted: { $ne: true },
          stock_quantity: { $gte: quantity },
        },
        { $inc: { stock_quantity: -quantity } },
        { new: true },
      )
      .exec()) as unknown as PosItem | null;

    if (!updated) {
      throw new BadRequestException(
        `Stock insuffisant pour « ${item.name} » (demandé : ${quantity})`,
      );
    }

    if (this.isLowStock(updated)) {
      this.logger.warn(
        `Stock bas pour « ${updated.name} » : ${updated.stock_quantity} restant(s) (seuil ${updated.low_stock_threshold})`,
      );
    }
    return updated;
  }

  /** Ré-incrémente atomiquement le stock (réassort, annulation de vente). */
  async incrementStock(id: string, quantity: number): Promise<PosItem> {
    this.assertPositiveQuantity(quantity);
    const item = await this.findOne(id);
    if (!item.track_stock) {
      return item;
    }
    const updated = (await this.posItemModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id) },
        { $inc: { stock_quantity: quantity } },
        { new: true },
      )
      .exec()) as unknown as PosItem | null;
    if (!updated) {
      throw new NotFoundException(`${PosItem.name} introuvable (id: ${id})`);
    }
    return updated;
  }

  /** Active un article (le rend disponible à la vente). */
  async activate(id: string): Promise<PosItem> {
    return super.update(id, { is_active: true });
  }

  /** Désactive un article (le retire du catalogue). */
  async deactivate(id: string): Promise<PosItem> {
    return super.update(id, { is_active: false });
  }

  /** Récupère un article actif et non supprimé, sinon 404 / 400. */
  async findActiveOrFail(id: string): Promise<PosItem> {
    const item = await this.findOne(id);
    if (item.is_deleted) {
      throw new NotFoundException(`${PosItem.name} introuvable (id: ${id})`);
    }
    if (!item.is_active) {
      throw new BadRequestException(
        `L'article « ${item.name} » n'est pas disponible à la vente`,
      );
    }
    return item;
  }

  /** Indique si un article est sous son seuil d'alerte de stock. */
  isLowStock(
    item: Pick<
      PosItem,
      'track_stock' | 'stock_quantity' | 'low_stock_threshold'
    >,
  ): boolean {
    return (
      item.track_stock === true &&
      item.stock_quantity <= (item.low_stock_threshold ?? 0)
    );
  }

  private assertTracksStock(item: PosItem): void {
    if (!item.track_stock) {
      throw new BadRequestException(
        `L'article « ${item.name} » ne fait pas l'objet d'un suivi de stock`,
      );
    }
  }

  private assertPositiveQuantity(quantity: number): void {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new BadRequestException(
        'La quantité doit être un entier strictement positif',
      );
    }
  }

  private async assertSkuAvailable(
    propertyId: string,
    sku: string,
    excludeId?: string,
  ): Promise<void> {
    const filter: Record<string, unknown> = {
      property_id: new Types.ObjectId(propertyId),
      sku: sku.trim().toUpperCase(),
      is_deleted: { $ne: true },
    };
    if (excludeId) {
      filter._id = { $ne: new Types.ObjectId(excludeId) };
    }
    if (await this.repository.exists(filter as QueryFilter<PosItem>)) {
      throw new ConflictException(
        `Un article avec le SKU « ${sku} » existe déjà pour cet établissement`,
      );
    }
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
