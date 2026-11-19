import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types } from 'mongoose';
import { BaseCrudService } from '../../common/services/base-crud.service';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { StockLocation } from '../schemas/stock-location.entity';
import {
  CreateStockLocationDto,
  StockLocationQueryDto,
  UpdateStockLocationDto,
} from '../dto/stock-location.dto';
import { DEFAULT_LOCATIONS, StockLocationType } from '../inventory.enums';
import {
  escapeRegex,
  isDuplicateKeyError,
  toObjectId,
} from '../inventory.utils';

/** Emplacements de stock et configuration initiale d'un établissement. */
@Injectable()
export class StockLocationService extends BaseCrudService<
  StockLocation,
  CreateStockLocationDto,
  UpdateStockLocationDto
> {
  constructor(
    @InjectModel(StockLocation.name)
    protected readonly locationModel: Model<StockLocation>,
  ) {
    super(locationModel, StockLocation.name);
  }

  async create(dto: CreateStockLocationDto): Promise<StockLocation> {
    if (dto.parent_id) await this.assertParent(dto.property_id, dto.parent_id);
    try {
      const created = await super.create({
        ...dto,
        code: dto.code.toUpperCase(),
      });
      if (dto.is_default) await this.clearOtherDefaults(created);
      return created;
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new ConflictException(
          `Un emplacement de code « ${dto.code.toUpperCase()} » existe déjà`,
        );
      }
      throw error;
    }
  }

  async update(
    id: string,
    dto: UpdateStockLocationDto,
  ): Promise<StockLocation> {
    const current = await this.findOne(id);
    if (dto.parent_id) {
      if (dto.parent_id === id) {
        throw new ConflictException(
          'Un emplacement ne peut pas être son propre parent',
        );
      }
      await this.assertParent(String(current.property_id), dto.parent_id);
    }
    try {
      const updated = await super.update(id, {
        ...dto,
        ...(dto.code ? { code: dto.code.toUpperCase() } : {}),
      });
      if (dto.is_default) await this.clearOtherDefaults(updated);
      return updated;
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new ConflictException('Ce code d’emplacement est déjà utilisé');
      }
      throw error;
    }
  }

  async findAll(
    query: StockLocationQueryDto,
    filter: QueryFilter<StockLocation> = {},
  ): Promise<PaginatedResult<StockLocation>> {
    const criteria: Record<string, unknown> = { ...filter };
    if (query.property_id) {
      criteria.property_id = new Types.ObjectId(query.property_id);
    }
    if (query.location_type) criteria.location_type = query.location_type;
    if (query.search) {
      const pattern = new RegExp(escapeRegex(query.search.trim()), 'i');
      criteria.$or = [{ name: pattern }, { code: pattern }];
    }
    return super.findAll(query, criteria);
  }

  protected getDefaultSort(): string {
    return 'code';
  }

  /**
   * Crée (de manière idempotente) les emplacements par défaut :
   * stock principal, bar, économat, fournisseurs, clients, pertes,
   * consommation interne. Les emplacements existants ne sont pas modifiés.
   */
  async setup(propertyId: string): Promise<StockLocation[]> {
    const property = toObjectId(propertyId, 'Établissement');
    for (const def of DEFAULT_LOCATIONS) {
      try {
        await this.locationModel
          .updateOne(
            { property_id: property, code: def.code },
            {
              $setOnInsert: {
                property_id: property,
                code: def.code,
                name: def.name,
                location_type: def.location_type,
                is_default: def.is_default,
                is_active: true,
                is_deleted: false,
              },
            },
            { upsert: true },
          )
          .exec();
      } catch (error) {
        // Création concurrente : l'emplacement existe déjà.
        if (!isDuplicateKeyError(error)) throw error;
      }
    }
    return await this.locationModel
      .find({ property_id: property, is_deleted: { $ne: true } })
      .sort({ code: 1 })
      .lean()
      .exec();
  }

  /** Emplacement par défaut d'un type (configuration créée au besoin). */
  async getDefault(
    propertyId: string,
    type: StockLocationType,
  ): Promise<StockLocation> {
    const find = () =>
      this.locationModel
        .findOne({
          property_id: toObjectId(propertyId, 'Établissement'),
          location_type: type,
          is_deleted: { $ne: true },
          is_active: { $ne: false },
        })
        .sort({ is_default: -1, created_at: 1 })
        .lean()
        .exec() as unknown as Promise<StockLocation | null>;
    let location = await find();
    if (!location) {
      await this.setup(propertyId);
      location = await find();
    }
    if (!location) {
      throw new NotFoundException(
        `Aucun emplacement de type « ${type} » pour cet établissement`,
      );
    }
    return location;
  }

  /** Emplacement par code (configuration créée au besoin). */
  async getByCode(
    propertyId: string,
    code: string,
  ): Promise<StockLocation | null> {
    const find = () =>
      this.locationModel
        .findOne({
          property_id: toObjectId(propertyId, 'Établissement'),
          code: code.toUpperCase(),
          is_deleted: { $ne: true },
        })
        .lean()
        .exec() as unknown as Promise<StockLocation | null>;
    const location = await find();
    if (location) return location;
    await this.setup(propertyId);
    return find();
  }

  /** Charge plusieurs emplacements (lean) indexés par identifiant. */
  async findManyById(
    ids: Types.ObjectId[],
  ): Promise<Map<string, StockLocation>> {
    const rows = (await this.locationModel
      .find({ _id: { $in: ids } })
      .lean()
      .exec()) as unknown as StockLocation[];
    return new Map(rows.map((row) => [String(row._id), row]));
  }

  /** Identifiants des emplacements internes d'un établissement. */
  async internalLocationIds(propertyId: string): Promise<Types.ObjectId[]> {
    const rows = (await this.locationModel
      .find({
        property_id: toObjectId(propertyId, 'Établissement'),
        location_type: StockLocationType.INTERNAL,
        is_deleted: { $ne: true },
      })
      .select('_id')
      .lean()
      .exec()) as unknown as Array<{ _id: Types.ObjectId }>;
    return rows.map((row) => row._id);
  }

  private async assertParent(propertyId: string, parentId: string) {
    const parent = await this.locationModel
      .findOne({
        _id: toObjectId(parentId, 'Emplacement parent'),
        property_id: toObjectId(propertyId, 'Établissement'),
        is_deleted: { $ne: true },
      })
      .lean()
      .exec();
    if (!parent) {
      throw new NotFoundException(
        'Emplacement parent introuvable pour cet établissement',
      );
    }
  }

  /** Un seul emplacement par défaut par type et par établissement. */
  private async clearOtherDefaults(location: StockLocation) {
    await this.locationModel
      .updateMany(
        {
          property_id: location.property_id,
          location_type: location.location_type,
          _id: { $ne: location._id },
          is_default: true,
        },
        { $set: { is_default: false } },
      )
      .exec();
  }
}
