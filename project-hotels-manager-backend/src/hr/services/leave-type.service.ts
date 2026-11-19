import { ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter } from 'mongoose';
import { BaseCrudService } from '../../common/services/base-crud.service';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { LeaveType } from '../schemas/leave-type.entity';
import { CreateLeaveTypeDto, UpdateLeaveTypeDto } from '../dto/leave.dto';
import { DepartmentQueryDto } from '../dto/department.dto';
import { escapeRegex, isDuplicateKeyError, toObjectId } from '../hr.utils';

/** Types de congé d'un établissement. */
@Injectable()
export class LeaveTypeService extends BaseCrudService<
  LeaveType,
  CreateLeaveTypeDto,
  UpdateLeaveTypeDto
> {
  constructor(
    @InjectModel(LeaveType.name)
    protected readonly leaveTypeModel: Model<LeaveType>,
  ) {
    super(leaveTypeModel, LeaveType.name);
  }

  async create(dto: CreateLeaveTypeDto): Promise<LeaveType> {
    try {
      return await super.create({
        ...dto,
        code: dto.code.trim().toUpperCase(),
      });
    } catch (error) {
      throw this.mapError(error);
    }
  }

  async update(id: string, dto: UpdateLeaveTypeDto): Promise<LeaveType> {
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
  ): Promise<PaginatedResult<LeaveType>> {
    const filter: QueryFilter<LeaveType> = {};
    if (query.property_id)
      filter.property_id = toObjectId(query.property_id, 'property_id');
    if (query.search) {
      const regex = new RegExp(escapeRegex(query.search), 'i');
      filter.$or = [{ name: regex }, { code: regex }];
    }
    return super.findAll(query, filter);
  }

  private mapError(error: unknown) {
    return isDuplicateKeyError(error)
      ? new ConflictException('Un type de congé avec ce code existe déjà')
      : error;
  }
}
