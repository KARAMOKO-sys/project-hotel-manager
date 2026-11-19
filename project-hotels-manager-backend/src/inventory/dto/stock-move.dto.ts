import { OmitType, PartialType } from '@nestjs/mapped-types';
import {
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { StockMoveState } from '../inventory.enums';

export class CreateStockMoveDto {
  @IsMongoId()
  property_id!: string;

  @IsMongoId()
  product_id!: string;

  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  quantity!: number;

  @IsMongoId()
  source_location_id!: string;

  @IsMongoId()
  dest_location_id!: string;

  /** Coût unitaire ; par défaut le coût moyen de l'article. */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unit_cost?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

/** Modifiable uniquement à l'état brouillon ; l'établissement est figé. */
export class UpdateStockMoveDto extends PartialType(
  OmitType(CreateStockMoveDto, ['property_id'] as const),
) {}

export class StockMoveQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsMongoId()
  property_id?: string;

  @IsOptional()
  @IsMongoId()
  product_id?: string;

  /** Mouvements dont la source OU la destination est cet emplacement. */
  @IsOptional()
  @IsMongoId()
  location_id?: string;

  @IsOptional()
  @IsEnum(StockMoveState)
  state?: StockMoveState;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  origin_model?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  origin_id?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
