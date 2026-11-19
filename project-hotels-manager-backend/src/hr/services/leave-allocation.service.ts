import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter } from 'mongoose';
import { BaseCrudService } from '../../common/services/base-crud.service';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { LeaveAllocation } from '../schemas/leave-allocation.entity';
import { LeaveType } from '../schemas/leave-type.entity';
import {
  CreateLeaveAllocationDto,
  GenerateAllocationsDto,
  LeaveAllocationQueryDto,
  UpdateLeaveAllocationDto,
} from '../dto/leave.dto';
import { HrStaffService } from './hr-staff.service';
import { isDuplicateKeyError, toObjectId } from '../hr.utils';

/** Allocations annuelles de congés (une par employé, type et année). */
@Injectable()
export class LeaveAllocationService extends BaseCrudService<
  LeaveAllocation,
  CreateLeaveAllocationDto,
  UpdateLeaveAllocationDto
> {
  constructor(
    @InjectModel(LeaveAllocation.name)
    protected readonly allocationModel: Model<LeaveAllocation>,
    @InjectModel(LeaveType.name)
    private readonly leaveTypeModel: Model<LeaveType>,
    private readonly staff: HrStaffService,
  ) {
    super(allocationModel, LeaveAllocation.name);
  }

  async create(dto: CreateLeaveAllocationDto): Promise<LeaveAllocation> {
    const staff = await this.staff.get(dto.staff_id, dto.property_id);
    const type = await this.leaveTypeModel
      .findOne({
        _id: toObjectId(dto.leave_type_id, 'leave_type_id'),
        property_id: staff.property_id,
        is_deleted: { $ne: true },
      })
      .lean()
      .exec();
    if (!type) {
      throw new BadRequestException(
        'Type de congé introuvable pour cet établissement',
      );
    }
    try {
      return await super.create({
        ...dto,
        property_id: staff.property_id,
      } as never);
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new ConflictException(
          'Une allocation existe déjà pour cet employé, ce type et cette année',
        );
      }
      throw error;
    }
  }

  async findAll(
    query: LeaveAllocationQueryDto,
  ): Promise<PaginatedResult<LeaveAllocation>> {
    const filter: QueryFilter<LeaveAllocation> = {};
    if (query.property_id)
      filter.property_id = toObjectId(query.property_id, 'property_id');
    if (query.staff_id)
      filter.staff_id = toObjectId(query.staff_id, 'staff_id');
    if (query.year) filter.year = query.year;
    return super.findAll(query, filter);
  }

  /**
   * Génère (idempotent) les allocations de l'année pour tout le personnel en
   * cours de l'établissement, à partir de `annual_allocation_days` de chaque
   * type actif. Les allocations existantes ne sont jamais écrasées.
   */
  async generate(dto: GenerateAllocationsDto): Promise<{ created: number }> {
    const propertyId = toObjectId(dto.property_id, 'property_id');
    const [types, staff] = await Promise.all([
      this.leaveTypeModel
        .find({
          property_id: propertyId,
          is_active: true,
          is_deleted: { $ne: true },
          annual_allocation_days: { $gt: 0 },
        })
        .lean()
        .exec(),
      this.staff.listCurrent(propertyId),
    ]);
    if (types.length === 0 || staff.length === 0) return { created: 0 };
    const ops = staff.flatMap((member) =>
      types.map((type) => ({
        updateOne: {
          filter: {
            staff_id: member._id,
            leave_type_id: type._id,
            year: dto.year,
            is_deleted: false,
          },
          update: {
            $setOnInsert: {
              property_id: propertyId,
              staff_id: member._id,
              leave_type_id: type._id,
              year: dto.year,
              days: type.annual_allocation_days,
              is_deleted: false,
            },
          },
          upsert: true,
        },
      })),
    );
    const result = await this.allocationModel.bulkWrite(ops, {
      ordered: false,
    });
    return { created: result.upsertedCount ?? 0 };
  }
}
