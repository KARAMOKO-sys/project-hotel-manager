import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types } from 'mongoose';
import { BaseCrudService } from '../../common/services/base-crud.service';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import {
  InventoryCount,
  InventoryCountLine,
} from '../schemas/inventory-count.entity';
import { StockQuant } from '../schemas/stock-quant.entity';
import { StockLocation } from '../schemas/stock-location.entity';
import {
  CreateInventoryCountDto,
  InventoryCountLineDto,
  InventoryCountQueryDto,
  UpdateInventoryCountDto,
} from '../dto/inventory-count.dto';
import { InventoryCountState, StockLocationType } from '../inventory.enums';
import { roundQty, toObjectId } from '../inventory.utils';
import { StockMoveService } from './stock-move.service';
import { StockLocationService } from './stock-location.service';

/**
 * Inventaires physiques : les quantités comptées remplacent les quantités
 * théoriques via des mouvements d'ajustement avec l'emplacement « Pertes
 * d'inventaire » (entrée si excédent, sortie si manquant).
 */
@Injectable()
export class InventoryCountService extends BaseCrudService<
  InventoryCount,
  CreateInventoryCountDto,
  UpdateInventoryCountDto
> {
  private readonly logger = new Logger(InventoryCountService.name);

  constructor(
    @InjectModel(InventoryCount.name)
    protected readonly countModel: Model<InventoryCount>,
    @InjectModel(StockQuant.name)
    private readonly quantModel: Model<StockQuant>,
    @InjectModel(StockLocation.name)
    private readonly locationModel: Model<StockLocation>,
    private readonly moves: StockMoveService,
    private readonly locations: StockLocationService,
  ) {
    super(countModel, InventoryCount.name);
  }

  async create(dto: CreateInventoryCountDto): Promise<InventoryCount> {
    const lines = [...(dto.lines ?? [])];
    if (dto.location_id) {
      await this.assertInternalLocations(dto.property_id, [dto.location_id]);
      const quants = (await this.quantModel
        .find({ location_id: new Types.ObjectId(dto.location_id) })
        .lean()
        .exec()) as unknown as StockQuant[];
      for (const quant of quants) {
        if (
          !lines.some(
            (l) =>
              l.product_id === String(quant.product_id) &&
              l.location_id === dto.location_id,
          )
        ) {
          lines.push({
            product_id: String(quant.product_id),
            location_id: dto.location_id,
          });
        }
      }
    }
    const built = await this.buildLines(dto.property_id, lines);
    return super.create({
      property_id: new Types.ObjectId(dto.property_id),
      name: dto.name,
      count_date: dto.count_date ? new Date(dto.count_date) : new Date(),
      notes: dto.notes,
      lines: built,
      state: InventoryCountState.DRAFT,
    } as unknown as CreateInventoryCountDto);
  }

  /** Saisie des quantités comptées (les lignes fournies remplacent les autres). */
  async update(
    id: string,
    dto: UpdateInventoryCountDto,
  ): Promise<InventoryCount> {
    const count = await this.findOne(id);
    this.assertDraft(count);
    const set: Record<string, unknown> = {};
    if (dto.name !== undefined) set.name = dto.name;
    if (dto.notes !== undefined) set.notes = dto.notes;
    if (dto.lines) {
      set.lines = await this.buildLines(String(count.property_id), dto.lines);
    }
    const updated = await this.countModel
      .findOneAndUpdate(
        { _id: count._id, state: InventoryCountState.DRAFT },
        { $set: set },
        { new: true, runValidators: true },
      )
      .exec();
    if (!updated) {
      throw new ConflictException(
        "L'inventaire a changé d'état ; veuillez actualiser puis réessayer",
      );
    }
    return updated;
  }

  async findAll(
    query: InventoryCountQueryDto,
    filter: QueryFilter<InventoryCount> = {},
  ): Promise<PaginatedResult<InventoryCount>> {
    const criteria: Record<string, unknown> = { ...filter };
    if (query.property_id) {
      criteria.property_id = new Types.ObjectId(query.property_id);
    }
    if (query.state) criteria.state = query.state;
    return super.findAll(query, criteria);
  }

  /** Annule un inventaire brouillon. */
  async cancel(id: string): Promise<InventoryCount> {
    const count = await this.findOne(id);
    this.assertDraft(count);
    const updated = await this.countModel
      .findOneAndUpdate(
        { _id: count._id, state: InventoryCountState.DRAFT },
        { $set: { state: InventoryCountState.CANCELLED } },
        { new: true },
      )
      .exec();
    if (!updated) throw new ConflictException('Inventaire déjà traité');
    return updated;
  }

  /**
   * Applique l'inventaire : pour chaque ligne comptée, écart = compté −
   * stock actuel, puis mouvement d'ajustement validé.
   */
  async apply(id: string, actorId?: string): Promise<InventoryCount> {
    const count = await this.findOne(id);
    this.assertDraft(count);
    const claimed = (await this.countModel
      .findOneAndUpdate(
        { _id: count._id, state: InventoryCountState.DRAFT },
        {
          $set: {
            state: InventoryCountState.APPLIED,
            applied_at: new Date(),
            applied_by: actorId,
          },
        },
        { new: true },
      )
      .exec()) as unknown as InventoryCount | null;
    if (!claimed) throw new ConflictException('Inventaire déjà traité');

    const propertyId = String(claimed.property_id);
    const loss = await this.locations.getDefault(
      propertyId,
      StockLocationType.INVENTORY_LOSS,
    );
    const lines: InventoryCountLine[] = [];
    for (const raw of claimed.lines) {
      const line: InventoryCountLine = {
        product_id: raw.product_id,
        location_id: raw.location_id,
        theoretical_qty: raw.theoretical_qty,
        counted_qty: raw.counted_qty,
      };
      lines.push(line);
      if (line.counted_qty === undefined || line.counted_qty === null) continue;
      const current = await this.moves.getQuantityAt(
        line.product_id,
        line.location_id,
      );
      const difference = roundQty(line.counted_qty - current);
      line.theoretical_qty = current;
      line.difference = difference;
      if (difference === 0) continue;
      try {
        const move = await this.moves.createAndValidate(
          {
            property_id: propertyId,
            product_id: String(line.product_id),
            quantity: Math.abs(difference),
            source_location_id: String(
              difference > 0 ? loss._id : line.location_id,
            ),
            dest_location_id: String(
              difference > 0 ? line.location_id : loss._id,
            ),
            origin: { model: InventoryCount.name, id: String(claimed._id) },
            notes: `Ajustement d'inventaire « ${claimed.name} »`,
          },
          actorId,
        );
        line.move_id = move._id;
      } catch (error) {
        line.error = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `Ajustement d'inventaire non appliqué (${String(line.product_id)}) : ${line.error}`,
        );
      }
    }
    const updated = await this.countModel
      .findByIdAndUpdate(claimed._id, { $set: { lines } }, { new: true })
      .exec();
    return updated ?? claimed;
  }

  // ---------------------------------------------------------------------------

  private assertDraft(count: InventoryCount) {
    if (count.state !== InventoryCountState.DRAFT) {
      throw new ConflictException(
        count.state === InventoryCountState.APPLIED
          ? 'Cet inventaire est déjà appliqué'
          : 'Cet inventaire est annulé',
      );
    }
  }

  /** Construit les lignes avec la quantité théorique actuelle. */
  private async buildLines(
    propertyId: string,
    lines: InventoryCountLineDto[],
  ): Promise<InventoryCountLine[]> {
    const seen = new Set<string>();
    for (const line of lines) {
      const key = `${line.product_id}|${line.location_id}`;
      if (seen.has(key)) {
        throw new BadRequestException(
          'Un même article apparaît deux fois pour le même emplacement',
        );
      }
      seen.add(key);
    }
    await this.assertInternalLocations(propertyId, [
      ...new Set(lines.map((l) => l.location_id)),
    ]);
    const built: InventoryCountLine[] = [];
    for (const line of lines) {
      built.push({
        product_id: toObjectId(line.product_id, 'Article'),
        location_id: toObjectId(line.location_id, 'Emplacement'),
        theoretical_qty: await this.moves.getQuantityAt(
          line.product_id,
          line.location_id,
        ),
        counted_qty:
          line.counted_qty === undefined
            ? undefined
            : roundQty(line.counted_qty),
      });
    }
    return built;
  }

  private async assertInternalLocations(propertyId: string, ids: string[]) {
    if (ids.length === 0) return;
    const found = await this.locationModel
      .countDocuments({
        _id: { $in: ids.map((id) => toObjectId(id, 'Emplacement')) },
        property_id: toObjectId(propertyId, 'Établissement'),
        location_type: StockLocationType.INTERNAL,
        is_deleted: { $ne: true },
      })
      .exec();
    if (found !== ids.length) {
      throw new BadRequestException(
        "Un inventaire ne porte que sur des emplacements internes de l'établissement",
      );
    }
  }
}
