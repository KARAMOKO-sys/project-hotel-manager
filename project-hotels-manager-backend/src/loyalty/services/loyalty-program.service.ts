import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter } from 'mongoose';
import { BaseCrudService } from '../../common/services/base-crud.service';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { LoyaltyProgram } from '../schemas/loyalty-program.entity';
import {
  CreateLoyaltyProgramDto,
  LoyaltyProgramQueryDto,
  LoyaltyTierRuleDto,
  UpdateLoyaltyProgramDto,
} from '../dto/loyalty-program.dto';
import { escapeRegex, isDuplicateKeyError, toObjectId } from '../loyalty.utils';

/**
 * Programmes de fidélité (établissement ou organisation). Le programme d'un
 * établissement prime sur celui de son organisation.
 */
@Injectable()
export class LoyaltyProgramService extends BaseCrudService<
  LoyaltyProgram,
  CreateLoyaltyProgramDto,
  UpdateLoyaltyProgramDto
> {
  constructor(
    @InjectModel(LoyaltyProgram.name)
    protected readonly programModel: Model<LoyaltyProgram>,
  ) {
    super(programModel, LoyaltyProgram.name);
  }

  async create(dto: CreateLoyaltyProgramDto): Promise<LoyaltyProgram> {
    if (!!dto.property_id === !!dto.organization_id) {
      throw new BadRequestException(
        'Indiquez soit un établissement (property_id), soit une organisation (organization_id)',
      );
    }
    const scope_key = dto.property_id
      ? `property:${String(toObjectId(dto.property_id, 'property_id'))}`
      : `organization:${String(toObjectId(dto.organization_id, 'organization_id'))}`;
    try {
      return await super.create({
        ...dto,
        scope_key,
        tiers: this.normalizeTiers(dto.tiers),
      } as never);
    } catch (error) {
      throw this.mapError(error);
    }
  }

  async update(
    id: string,
    dto: UpdateLoyaltyProgramDto,
  ): Promise<LoyaltyProgram> {
    try {
      return await super.update(id, {
        ...dto,
        ...(dto.tiers ? { tiers: this.normalizeTiers(dto.tiers) } : {}),
      });
    } catch (error) {
      throw this.mapError(error);
    }
  }

  async findAll(
    query: LoyaltyProgramQueryDto,
  ): Promise<PaginatedResult<LoyaltyProgram>> {
    const filter: QueryFilter<LoyaltyProgram> = {};
    if (query.property_id)
      filter.property_id = toObjectId(query.property_id, 'property_id');
    if (query.organization_id)
      filter.organization_id = toObjectId(
        query.organization_id,
        'organization_id',
      );
    if (query.is_active !== undefined) filter.is_active = query.is_active;
    if (query.search) filter.name = new RegExp(escapeRegex(query.search), 'i');
    return super.findAll(query, filter);
  }

  /** Programme actif applicable : celui de l'établissement, sinon de l'organisation. */
  async findActiveFor(
    propertyId?: string | null,
    organizationId?: string | null,
  ): Promise<LoyaltyProgram | null> {
    const keys: string[] = [];
    if (propertyId) keys.push(`property:${propertyId}`);
    if (organizationId) keys.push(`organization:${organizationId}`);
    if (keys.length === 0) return null;
    const programs = (await this.programModel
      .find({
        scope_key: { $in: keys },
        is_active: true,
        is_deleted: { $ne: true },
      })
      .lean()
      .exec()) as unknown as LoyaltyProgram[];
    return (
      programs.find((p) => p.scope_key === keys[0]) ??
      programs.find((p) => p.scope_key === keys[1]) ??
      null
    );
  }

  /** Paliers triés par seuil, un seul par niveau, seuils croissants. */
  normalizeTiers(tiers?: LoyaltyTierRuleDto[]) {
    if (!tiers) return [];
    const seen = new Set<string>();
    for (const t of tiers) {
      if (seen.has(t.tier)) {
        throw new BadRequestException(`Niveau en double : ${t.tier}`);
      }
      seen.add(t.tier);
    }
    return [...tiers]
      .sort((a, b) => a.min_lifetime_points - b.min_lifetime_points)
      .map((t) => ({ ...t, earn_multiplier: t.earn_multiplier ?? 1 }));
  }

  private mapError(error: unknown) {
    return isDuplicateKeyError(error)
      ? new ConflictException(
          'Un programme actif existe déjà pour cette portée',
        )
      : error;
  }
}
