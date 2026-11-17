import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseCrudService } from '../../common/services/base-crud.service';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import {
  BlockedDate,
  BlockedDateDocument,
} from '../schemas/blocked-date.entity';
import { CreateBlockedDateDto } from '../dto/create-blocked-date.dto';
import { UpdateBlockedDateDto } from '../dto/update-blocked-date.dto';

/** Cible d'un blocage : chambre, type de chambre ou propriété entière. */
export interface BlockTarget {
  roomId?: string;
  roomTypeId?: string;
}

/**
 * Service de gestion des dates bloquées.
 *
 * Permet de bloquer / débloquer une chambre, un type de chambre ou une
 * propriété sur une plage de dates, en interdisant les chevauchements, et
 * expose une vérification `isBlocked` utilisable par le moteur de
 * disponibilité.
 */
@Injectable()
export class BlockedDateService extends BaseCrudService<
  BlockedDate,
  CreateBlockedDateDto,
  UpdateBlockedDateDto
> {
  constructor(
    @InjectModel(BlockedDate.name)
    protected readonly blockedDateModel: Model<BlockedDate>,
  ) {
    super(blockedDateModel, BlockedDate.name);
  }

  /**
   * Bloque une période (`blockDates`).
   * Lève 400 si la période est invalide, 409 si elle chevauche un blocage actif.
   */
  async create(dto: CreateBlockedDateDto): Promise<BlockedDate> {
    const { start, end } = this.parseRange(dto.start_date, dto.end_date);
    const target: BlockTarget = {
      roomId: dto.room_id,
      roomTypeId: dto.room_type_id,
    };

    await this.assertNoOverlap(dto.property_id, start, end, target);

    return super.create({
      ...dto,
      start_date: start,
      end_date: end,
      is_active: true,
    } as unknown as CreateBlockedDateDto);
  }

  /** Met à jour un blocage en revalidant la période et les chevauchements. */
  async update(id: string, dto: UpdateBlockedDateDto): Promise<BlockedDate> {
    const existing = await this.findOne(id);
    const { start, end } = this.parseRange(
      dto.start_date ?? existing.start_date,
      dto.end_date ?? existing.end_date,
    );
    const target: BlockTarget = {
      roomId: dto.room_id ?? existing.room_id?.toString(),
      roomTypeId: dto.room_type_id ?? existing.room_type_id?.toString(),
    };

    if (existing.is_active) {
      await this.assertNoOverlap(
        existing.property_id.toString(),
        start,
        end,
        target,
        id,
      );
    }

    return super.update(id, {
      ...dto,
      start_date: start,
      end_date: end,
    } as unknown as UpdateBlockedDateDto);
  }

  /** Libère une période bloquée (`unblockDates`). */
  async unblock(id: string): Promise<BlockedDate> {
    const existing = await this.findOne(id);
    if (!existing.is_active) {
      throw new BadRequestException('Cette période est déjà débloquée');
    }
    return super.update(id, {
      is_active: false,
      unblocked_at: new Date(),
    } as unknown as UpdateBlockedDateDto);
  }

  /**
   * Liste les blocages actifs d'une propriété qui chevauchent une période
   * (`getBlockedDates`). Filtrable par chambre / type de chambre.
   */
  async getBlockedDates(
    propertyId: string,
    startDate: string | Date,
    endDate: string | Date,
    target: BlockTarget = {},
  ): Promise<BlockedDate[]> {
    const { start, end } = this.parseRange(startDate, endDate);
    const filter: Record<string, unknown> = {
      ...this.overlapFilter(propertyId, start, end),
    };
    if (target.roomId) {
      filter.room_id = this.toObjectId(target.roomId, 'room_id');
    }
    if (target.roomTypeId) {
      filter.room_type_id = this.toObjectId(target.roomTypeId, 'room_type_id');
    }

    return this.blockedDateModel
      .find(filter)
      .sort({ start_date: 1 })
      .lean()
      .exec() as unknown as Promise<BlockedDate[]>;
  }

  /**
   * Indique si une chambre / un type de chambre / la propriété est bloqué(e)
   * sur au moins un jour de la période donnée. Les blocages de propriété
   * entière s'appliquent à toutes les chambres.
   */
  async isBlocked(
    propertyId: string,
    startDate: string | Date,
    endDate: string | Date,
    target: BlockTarget = {},
  ): Promise<boolean> {
    const { start, end } = this.parseRange(startDate, endDate);
    const count = await this.blockedDateModel
      .countDocuments({
        ...this.overlapFilter(propertyId, start, end),
        ...this.scopeFilter(target),
      })
      .exec();
    return count > 0;
  }

  /** Liste paginée des blocages d'une chambre. */
  findByRoom(roomId: string, query: PaginationQueryDto) {
    return this.findAll(query, {
      room_id: this.toObjectId(roomId, 'room_id'),
    });
  }

  /** Liste paginée des blocages d'une propriété. */
  findByProperty(propertyId: string, query: PaginationQueryDto) {
    return this.findAll(query, {
      property_id: this.toObjectId(propertyId, 'property_id'),
    });
  }

  protected getDefaultSort(): string {
    return 'start_date';
  }

  /** Lève 409 si un blocage actif de même portée chevauche la période. */
  private async assertNoOverlap(
    propertyId: string,
    start: Date,
    end: Date,
    target: BlockTarget,
    excludeId?: string,
  ): Promise<void> {
    const filter: Record<string, unknown> = {
      ...this.overlapFilter(propertyId, start, end),
      ...this.scopeFilter(target),
    };
    if (excludeId) {
      filter._id = { $ne: this.toObjectId(excludeId, 'id') };
    }

    const conflict = await this.blockedDateModel.findOne(filter).exec();
    if (conflict) {
      throw new ConflictException(
        `Cette période chevauche un blocage existant (id: ${String(conflict._id)})`,
      );
    }
  }

  /** Filtre des blocages actifs d'une propriété chevauchant [start, end]. */
  private overlapFilter(
    propertyId: string,
    start: Date,
    end: Date,
  ): Record<string, unknown> {
    return {
      property_id: this.toObjectId(propertyId, 'property_id'),
      is_active: true,
      is_deleted: { $ne: true },
      start_date: { $lte: end },
      end_date: { $gte: start },
    };
  }

  /**
   * Portée d'un blocage :
   *  - chambre : blocages de la chambre, de son type (si fourni) ou de la propriété ;
   *  - type : blocages du type (hors chambres) ou de la propriété ;
   *  - propriété : blocages de propriété entière uniquement.
   */
  private scopeFilter(target: BlockTarget): Record<string, unknown> {
    const propertyWide = { room_id: null, room_type_id: null };

    if (target.roomId) {
      const or: Record<string, unknown>[] = [
        { room_id: this.toObjectId(target.roomId, 'room_id') },
        propertyWide,
      ];
      if (target.roomTypeId) {
        or.push({
          room_id: null,
          room_type_id: this.toObjectId(target.roomTypeId, 'room_type_id'),
        });
      }
      return { $or: or };
    }

    if (target.roomTypeId) {
      return {
        $or: [
          {
            room_id: null,
            room_type_id: this.toObjectId(target.roomTypeId, 'room_type_id'),
          },
          propertyWide,
        ],
      };
    }

    return propertyWide;
  }

  /**
   * Valide et normalise une période en jours entiers UTC (bornes inclusives).
   * Lève 400 si une date est invalide ou si la fin précède le début.
   */
  private parseRange(
    startDate: string | Date,
    endDate: string | Date,
  ): { start: Date; end: Date } {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Date invalide');
    }
    start.setUTCHours(0, 0, 0, 0);
    end.setUTCHours(23, 59, 59, 999);
    if (end < start) {
      throw new BadRequestException(
        'La date de fin doit être postérieure ou égale à la date de début',
      );
    }
    return { start, end };
  }

  private toObjectId(id: string, field: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Identifiant invalide (${field})`);
    }
    return new Types.ObjectId(id);
  }
}
