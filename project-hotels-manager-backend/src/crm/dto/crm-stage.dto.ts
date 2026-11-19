import { OmitType, PartialType } from '@nestjs/mapped-types';
import {
  IsBoolean,
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

export class CreateCrmStageDto {
  @IsMongoId()
  property_id!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsInt()
  sequence?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  probability?: number;

  @IsOptional()
  @IsBoolean()
  is_won?: boolean;

  @IsOptional()
  @IsBoolean()
  is_lost?: boolean;

  @IsOptional()
  @IsBoolean()
  fold?: boolean;
}

export class UpdateCrmStageDto extends PartialType(
  OmitType(CreateCrmStageDto, ['property_id'] as const),
) {}

export class CrmStageQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsMongoId()
  property_id?: string;
}

export class CrmSetupDto {
  @IsMongoId()
  property_id!: string;
}
