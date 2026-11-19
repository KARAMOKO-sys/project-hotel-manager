import { OmitType, PartialType } from '@nestjs/mapped-types';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEmail,
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
import { Currency } from '../../base-entities/enums/currency.enum';
import {
  LeadSegment,
  LeadSource,
  LeadState,
  LeadType,
} from '../schemas/lead.entity';

export class CreateLeadDto {
  @IsMongoId()
  property_id!: string;

  @IsOptional()
  @IsEnum(LeadType)
  lead_type?: LeadType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  contact_name?: string;

  @IsOptional()
  @IsEmail()
  contact_email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  contact_phone?: string;

  @IsOptional()
  @IsMongoId()
  corporate_account_id?: string;

  @IsOptional()
  @IsMongoId()
  guest_id?: string;

  @IsOptional()
  @IsEnum(LeadSource)
  source?: LeadSource;

  @IsOptional()
  @IsEnum(LeadSegment)
  segment?: LeadSegment;

  @IsOptional()
  @IsDateString()
  arrival_date?: string;

  @IsOptional()
  @IsDateString()
  departure_date?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  rooms?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  guests?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  expected_revenue?: number;

  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  /** Par défaut : probabilité de l'étape. */
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  probability?: number;

  /** Par défaut : première étape ouverte du pipeline. */
  @IsOptional()
  @IsMongoId()
  stage_id?: string;

  @IsOptional()
  @IsMongoId()
  salesperson_id?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;
}

/** L'étape change via `POST :id/move`, l'état via win/lose. */
export class UpdateLeadDto extends PartialType(
  OmitType(CreateLeadDto, ['property_id', 'stage_id', 'lead_type'] as const),
) {}

export class ConvertLeadDto {
  @IsOptional()
  @IsMongoId()
  corporate_account_id?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  expected_revenue?: number;
}

export class MoveLeadDto {
  @IsMongoId()
  stage_id!: string;

  /** Utilisé si l'étape cible est « perdue ». */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  lost_reason?: string;
}

export class LoseLeadDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}

export class LeadQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsMongoId()
  property_id?: string;

  @IsOptional()
  @IsMongoId()
  stage_id?: string;

  @IsOptional()
  @IsEnum(LeadState)
  state?: LeadState;

  @IsOptional()
  @IsEnum(LeadType)
  lead_type?: LeadType;

  @IsOptional()
  @IsEnum(LeadSegment)
  segment?: LeadSegment;

  @IsOptional()
  @IsMongoId()
  salesperson_id?: string;

  @IsOptional()
  @IsMongoId()
  corporate_account_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  tag?: string;
}

export class PipelineQueryDto {
  @IsMongoId()
  property_id!: string;

  @IsOptional()
  @IsMongoId()
  salesperson_id?: string;

  @IsOptional()
  @IsEnum(LeadSegment)
  segment?: LeadSegment;

  /** Pistes dont l'arrivée est dans [from, to]. */
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
