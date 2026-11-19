import { PartialType, OmitType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { LeaveState } from '../schemas/leave-request.entity';

export class CreateLeaveTypeDto {
  @IsMongoId()
  property_id!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  code!: string;

  @IsOptional()
  @IsBoolean()
  paid?: boolean;

  @IsOptional()
  @IsBoolean()
  requires_approval?: boolean;

  @IsOptional()
  @IsBoolean()
  requires_allocation?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(366)
  annual_allocation_days?: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class UpdateLeaveTypeDto extends PartialType(
  OmitType(CreateLeaveTypeDto, ['property_id'] as const),
) {}

export class CreateLeaveAllocationDto {
  /** Établissement (doit être celui de l'affectation `staff_id`). */
  @IsMongoId()
  property_id!: string;

  @IsMongoId()
  staff_id!: string;

  @IsMongoId()
  leave_type_id!: string;

  @IsInt()
  @Min(2000)
  @Max(2100)
  year!: number;

  @IsNumber()
  @Min(0)
  @Max(366)
  days!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class UpdateLeaveAllocationDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(366)
  days?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class GenerateAllocationsDto {
  @IsMongoId()
  property_id!: string;

  @IsInt()
  @Min(2000)
  @Max(2100)
  year!: number;
}

export class LeaveAllocationQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsMongoId()
  property_id?: string;

  @IsOptional()
  @IsMongoId()
  staff_id?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  year?: number;
}

export class CreateLeaveRequestDto {
  /** Établissement (doit être celui de l'affectation `staff_id`). */
  @IsMongoId()
  property_id!: string;

  @IsMongoId()
  staff_id!: string;

  @IsMongoId()
  leave_type_id!: string;

  @IsDateString()
  start_date!: string;

  @IsDateString()
  end_date!: string;

  @IsOptional()
  @IsBoolean()
  start_half_day?: boolean;

  @IsOptional()
  @IsBoolean()
  end_half_day?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

/** Modifiable uniquement à l'état brouillon. */
export class UpdateLeaveRequestDto extends PartialType(
  OmitType(CreateLeaveRequestDto, ['staff_id', 'property_id'] as const),
) {}

export class RefuseLeaveDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

export class LeaveRequestQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsMongoId()
  property_id?: string;

  @IsOptional()
  @IsMongoId()
  staff_id?: string;

  @IsOptional()
  @IsEnum(LeaveState)
  state?: LeaveState;

  /** Demandes chevauchant la période [from, to]. */
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

export class LeaveBalanceQueryDto {
  @IsMongoId()
  staff_id!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year?: number;
}
