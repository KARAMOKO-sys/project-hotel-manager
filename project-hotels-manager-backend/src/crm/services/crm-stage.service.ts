import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types } from 'mongoose';
import { BaseCrudService } from '../../common/services/base-crud.service';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { CrmStage } from '../schemas/crm-stage.entity';
import { Lead } from '../schemas/lead.entity';
import {
  CreateCrmStageDto,
  CrmStageQueryDto,
  UpdateCrmStageDto,
} from '../dto/crm-stage.dto';
import {
  DEFAULT_CRM_STAGES,
  escapeRegex,
  isDuplicateKeyError,
  toObjectId,
} from '../crm.utils';

/** Étapes du pipeline CRM. */
@Injectable()
export class CrmStageService extends BaseCrudService<
  CrmStage,
  CreateCrmStageDto,
  UpdateCrmStageDto
> {
  constructor(
    @InjectModel(CrmStage.name) protected readonly stageModel: Model<CrmStage>,
    @InjectModel(Lead.name) private readonly leadModel: Model<Lead>,
  ) {
    super(stageModel, CrmStage.name);
  }

  async create(dto: CreateCrmStageDto): Promise<CrmStage> {
    this.assertFlags(dto.is_won, dto.is_lost);
    try {
      return await super.create(dto);
    } catch (error) {
      throw this.mapError(error);
    }
  }

  async update(id: string, dto: UpdateCrmStageDto): Promise<CrmStage> {
    const current = await this.findOne(id);
    this.assertFlags(
      dto.is_won ?? current.is_won,
      dto.is_lost ?? current.is_lost,
    );
    try {
      return await super.update(id, dto);
    } catch (error) {
      throw this.mapError(error);
    }
  }

  async findAll(query: CrmStageQueryDto): Promise<PaginatedResult<CrmStage>> {
    const filter: QueryFilter<CrmStage> = {};
    if (query.property_id)
      filter.property_id = toObjectId(query.property_id, 'property_id');
    if (query.search) filter.name = new RegExp(escapeRegex(query.search), 'i');
    return super.findAll({ ...query, sort: query.sort ?? 'sequence' }, filter);
  }

  /** Une étape utilisée par des pistes ne peut pas être supprimée. */
  async remove(id: string): Promise<CrmStage> {
    const stage = await this.findOne(id);
    const used = await this.leadModel
      .exists({ stage_id: stage._id, is_deleted: { $ne: true } })
      .exec();
    if (used) {
      throw new ConflictException(
        'Étape utilisée par des pistes : déplacez-les d’abord',
      );
    }
    return super.remove(id);
  }

  /**
   * Crée (idempotent) les étapes par défaut : Nouveau, Qualifié,
   * Proposition envoyée, Négociation, Gagné, Perdu.
   */
  async setup(
    propertyId: string,
  ): Promise<{ created: number; stages: CrmStage[] }> {
    const property = toObjectId(propertyId, 'property_id');
    const result = await this.stageModel.bulkWrite(
      DEFAULT_CRM_STAGES.map((stage) => ({
        updateOne: {
          filter: {
            property_id: property,
            name: stage.name,
            is_deleted: false,
          },
          update: {
            $setOnInsert: {
              ...stage,
              property_id: property,
              is_deleted: false,
            },
          },
          upsert: true,
        },
      })),
      { ordered: false },
    );
    return {
      created: result.upsertedCount ?? 0,
      stages: await this.listForProperty(property),
    };
  }

  async listForProperty(propertyId: Types.ObjectId): Promise<CrmStage[]> {
    return await this.stageModel
      .find({ property_id: propertyId, is_deleted: { $ne: true } })
      .sort({ sequence: 1, created_at: 1 })
      .lean()
      .exec();
  }

  /** Étape d'un établissement (400 si absente ou d'un autre établissement). */
  async getForProperty(
    stageId: string | Types.ObjectId,
    propertyId: Types.ObjectId,
  ): Promise<CrmStage> {
    const stage = await this.stageModel
      .findOne({
        _id: toObjectId(stageId, 'stage_id'),
        property_id: propertyId,
        is_deleted: { $ne: true },
      })
      .lean()
      .exec();
    if (!stage)
      throw new BadRequestException('Étape introuvable pour cet établissement');
    return stage;
  }

  /** Première étape ouverte ; crée les étapes par défaut s'il n'y en a aucune. */
  async getDefaultStage(propertyId: Types.ObjectId): Promise<CrmStage> {
    let stages = await this.listForProperty(propertyId);
    if (stages.length === 0)
      stages = (await this.setup(String(propertyId))).stages;
    const open = stages.find((s) => !s.is_won && !s.is_lost);
    if (!open)
      throw new BadRequestException('Aucune étape ouverte dans le pipeline');
    return open;
  }

  /** Première étape « gagnée » / « perdue » de l'établissement, si elle existe. */
  async findClosingStage(
    propertyId: Types.ObjectId,
    kind: 'won' | 'lost',
  ): Promise<CrmStage | null> {
    return await this.stageModel
      .findOne({
        property_id: propertyId,
        is_deleted: { $ne: true },
        ...(kind === 'won' ? { is_won: true } : { is_lost: true }),
      })
      .sort({ sequence: 1 })
      .lean()
      .exec();
  }

  private assertFlags(isWon?: boolean, isLost?: boolean) {
    if (isWon && isLost) {
      throw new BadRequestException(
        'Une étape ne peut pas être à la fois gagnée et perdue',
      );
    }
  }

  private mapError(error: unknown) {
    return isDuplicateKeyError(error)
      ? new ConflictException('Une étape portant ce nom existe déjà')
      : error;
  }
}
