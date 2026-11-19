import { PartialType, OmitType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { Currency } from '../../base-entities/enums/currency.enum';
import {
  ContractState,
  ContractType,
  WagePeriod,
} from '../schemas/employment-contract.entity';

export class CreateContractDto {
  @IsMongoId()
  property_id!: string;

  @IsMongoId()
  staff_id!: string;

  @IsEnum(ContractType)
  contract_type!: ContractType;

  @IsDateString()
  start_date!: string;

  /** Obligatoire pour un CDD ou un stage. */
  @IsOptional()
  @IsDateString()
  end_date?: string;

  @IsNumber()
  @Min(0)
  wage!: number;

  @IsOptional()
  @IsEnum(WagePeriod)
  wage_period?: WagePeriod;

  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(168)
  weekly_hours?: number;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  job_title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

/** Modifiable uniquement à l'état brouillon (sauf `notes`). */
export class UpdateContractDto extends PartialType(
  OmitType(CreateContractDto, ['property_id', 'staff_id'] as const),
) {}

export class TerminateContractDto {
  @IsOptional()
  @IsDateString()
  end_date?: string;

  @IsString()
  @MaxLength(500)
  reason!: string;
}

export class ContractQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsMongoId()
  property_id?: string;

  @IsOptional()
  @IsMongoId()
  staff_id?: string;

  @IsOptional()
  @IsEnum(ContractState)
  state?: ContractState;

  @IsOptional()
  @IsEnum(ContractType)
  contract_type?: ContractType;
}

export class ExpiringContractsQueryDto {
  @IsOptional()
  @IsMongoId()
  property_id?: string;

  /** Horizon en jours (défaut 30). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  days?: number;
}
