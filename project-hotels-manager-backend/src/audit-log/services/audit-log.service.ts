import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types } from 'mongoose';
import { BaseCrudService } from '../../common/services/base-crud.service';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import {
  AuditChange,
  AuditLog,
  AuditLogDocument,
} from '../schemas/audit-log.entity';
import { CreateAuditLogDto } from '../dto/create-audit-log.dto';
import { UpdateAuditLogDto } from '../dto/update-audit-log.dto';
import { AuditLogQueryDto } from '../dto/audit-log-query.dto';

/** Champs techniques ignorés dans le calcul des différences. */
const IGNORED_DIFF_FIELDS = new Set(['_id', '__v', 'created_at', 'updated_at']);

/**
 * Service du journal d'audit.
 *
 * Le journal est en écriture seule : `update`, `remove` et `restore` sont
 * interdits. Les différences avant/après sont calculées automatiquement.
 */
@Injectable()
export class AuditLogService extends BaseCrudService<
  AuditLog,
  CreateAuditLogDto,
  UpdateAuditLogDto
> {
  constructor(
    @InjectModel(AuditLog.name)
    protected readonly auditLogModel: Model<AuditLog>,
  ) {
    super(auditLogModel, AuditLog.name);
  }

  /** Enregistre une entrée d'audit (calcule le diff si nécessaire). */
  async create(dto: CreateAuditLogDto): Promise<AuditLog> {
    const changes =
      dto.changes ?? this.computeChanges(dto.old_values, dto.new_values);
    return super.create({
      ...dto,
      action: dto.action.trim().toLowerCase(),
      actor_type: dto.actor_type ?? (dto.actor_id ? 'user' : 'system'),
      changes,
    });
  }

  /** Alias explicite de `create` pour les autres modules. */
  log(entry: CreateAuditLogDto): Promise<AuditLog> {
    return this.create(entry);
  }

  /** Liste paginée avec filtres (action, entité, auteur, période). */
  async findAll(
    query: AuditLogQueryDto,
    filter: QueryFilter<AuditLog> = {},
  ): Promise<PaginatedResult<AuditLog>> {
    const criteria: Record<string, unknown> = { ...filter };
    if (query.action) criteria.action = query.action.trim().toLowerCase();
    if (query.entity_type) criteria.entity_type = query.entity_type;
    if (query.actor_id) criteria.actor_id = new Types.ObjectId(query.actor_id);
    if (query.property_id) {
      criteria.property_id = new Types.ObjectId(query.property_id);
    }
    const range = this.buildRange(query.from, query.to);
    if (range) criteria.created_at = range;
    return super.findAll(query, criteria as QueryFilter<AuditLog>);
  }

  /** Historique d'une entité donnée. */
  findByEntity(
    entityType: string,
    entityId: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<AuditLog>> {
    return super.findAll(query, {
      entity_type: entityType,
      entity_id: entityId,
    } as QueryFilter<AuditLog>);
  }

  /** Actions réalisées par un auteur. */
  findByActor(
    actorId: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<AuditLog>> {
    return super.findAll(query, {
      actor_id: new Types.ObjectId(actorId),
    } as QueryFilter<AuditLog>);
  }

  /** Entrées sur une période (bornes obligatoires). */
  async findByDateRange(
    from: string,
    to: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<AuditLog>> {
    if (!from || !to) {
      throw new BadRequestException(
        'Les paramètres « from » et « to » sont obligatoires',
      );
    }
    return super.findAll(query, {
      created_at: this.buildRange(from, to),
    } as QueryFilter<AuditLog>);
  }

  /** Interdit : le journal d'audit est immuable. */
  update(): Promise<AuditLog> {
    return Promise.reject(this.immutableError());
  }

  /** Interdit : le journal d'audit est immuable. */
  remove(): Promise<AuditLog> {
    return Promise.reject(this.immutableError());
  }

  /** Interdit : le journal d'audit est immuable. */
  restore(): Promise<AuditLog> {
    return Promise.reject(this.immutableError());
  }

  /**
   * Calcule la liste des champs modifiés entre deux états (comparaison
   * superficielle, valeurs sérialisées en JSON).
   */
  computeChanges(
    oldValues?: Record<string, any>,
    newValues?: Record<string, any>,
  ): AuditChange[] {
    if (!oldValues && !newValues) return [];
    const before = oldValues ?? {};
    const after = newValues ?? {};
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    const changes: AuditChange[] = [];
    for (const field of keys) {
      if (IGNORED_DIFF_FIELDS.has(field)) continue;
      const oldValue: unknown = before[field];
      const newValue: unknown = after[field];
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes.push({ field, old_value: oldValue, new_value: newValue });
      }
    }
    return changes;
  }

  private buildRange(
    from?: string,
    to?: string,
  ): Record<string, Date> | undefined {
    if (!from && !to) return undefined;
    const range: Record<string, Date> = {};
    if (from) range.$gte = this.parseDate(from, 'from');
    if (to) range.$lte = this.parseDate(to, 'to');
    if (range.$gte && range.$lte && range.$gte > range.$lte) {
      throw new BadRequestException(
        'La date de début doit précéder la date de fin',
      );
    }
    return range;
  }

  private parseDate(value: string, name: string): Date {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`Date « ${name} » invalide`);
    }
    return date;
  }

  private immutableError(): ForbiddenException {
    return new ForbiddenException(
      'Le journal d’audit est en écriture seule : modification et suppression interdites',
    );
  }
}
