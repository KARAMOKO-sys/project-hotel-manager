import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter } from 'mongoose';
import { BaseCrudService } from '../../common/services/base-crud.service';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { Department } from '../schemas/department.entity';
import {
  CreateDepartmentDto,
  DepartmentQueryDto,
  UpdateDepartmentDto,
} from '../dto/department.dto';
import { HrStaffService } from './hr-staff.service';
import { escapeRegex, isDuplicateKeyError, toObjectId } from '../hr.utils';

/** Départements RH (hiérarchie, responsable). */
@Injectable()
export class DepartmentService extends BaseCrudService<
  Department,
  CreateDepartmentDto,
  UpdateDepartmentDto
> {
  constructor(
    @InjectModel(Department.name)
    protected readonly departmentModel: Model<Department>,
    private readonly staff: HrStaffService,
  ) {
    super(departmentModel, Department.name);
  }

  async create(dto: CreateDepartmentDto): Promise<Department> {
    const propertyId = toObjectId(dto.property_id, 'property_id');
    if (dto.manager_staff_id)
      await this.staff.get(dto.manager_staff_id, propertyId);
    if (dto.parent_id)
      await this.assertParent(String(propertyId), dto.parent_id);
    try {
      return await super.create({
        ...dto,
        code: dto.code.trim().toUpperCase(),
      });
    } catch (error) {
      throw this.mapError(error);
    }
  }

  async update(id: string, dto: UpdateDepartmentDto): Promise<Department> {
    const current = await this.findOne(id);
    if (dto.manager_staff_id) {
      await this.staff.get(dto.manager_staff_id, current.property_id);
    }
    if (dto.parent_id) {
      if (dto.parent_id === id) {
        throw new BadRequestException(
          'Un département ne peut être son propre parent',
        );
      }
      await this.assertParent(String(current.property_id), dto.parent_id, id);
    }
    try {
      return await super.update(id, {
        ...dto,
        ...(dto.code ? { code: dto.code.trim().toUpperCase() } : {}),
      });
    } catch (error) {
      throw this.mapError(error);
    }
  }

  async findAll(
    query: DepartmentQueryDto,
  ): Promise<PaginatedResult<Department>> {
    const filter: QueryFilter<Department> = {};
    if (query.property_id)
      filter.property_id = toObjectId(query.property_id, 'property_id');
    if (query.parent_id)
      filter.parent_id = toObjectId(query.parent_id, 'parent_id');
    if (query.search) {
      const regex = new RegExp(escapeRegex(query.search), 'i');
      filter.$or = [{ name: regex }, { code: regex }];
    }
    return super.findAll(query, filter);
  }

  /** Le parent doit exister dans le même établissement, sans cycle. */
  private async assertParent(
    propertyId: string,
    parentId: string,
    selfId?: string,
  ) {
    let cursor: string | undefined = parentId;
    const seen = new Set<string>();
    while (cursor) {
      if (selfId && cursor === selfId) {
        throw new BadRequestException('Hiérarchie de départements cyclique');
      }
      if (seen.has(cursor)) break;
      seen.add(cursor);
      const parent = await this.departmentModel
        .findOne({
          _id: toObjectId(cursor, 'parent_id'),
          is_deleted: { $ne: true },
        })
        .select('property_id parent_id')
        .lean()
        .exec();
      if (!parent)
        throw new BadRequestException('Département parent introuvable');
      if (cursor === parentId && String(parent.property_id) !== propertyId) {
        throw new BadRequestException(
          'Le département parent appartient à un autre établissement',
        );
      }
      cursor = parent.parent_id ? String(parent.parent_id) : undefined;
    }
  }

  private mapError(error: unknown) {
    return isDuplicateKeyError(error)
      ? new ConflictException('Un département avec ce code existe déjà')
      : error;
  }
}
