import { OmitType, PartialType } from '@nestjs/mapped-types';
import {
  IsBoolean,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { StockLocationType } from '../inventory.enums';

export class CreateStockLocationDto {
  @IsMongoId()
  property_id!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsString()
  @Matches(/^[A-Za-z0-9_-]{1,30}$/, {
    message: 'Code invalide (lettres, chiffres, - et _, 30 caractères max.)',
  })
  code!: string;

  @IsEnum(StockLocationType)
  location_type!: StockLocationType;

  @IsOptional()
  @IsMongoId()
  parent_id?: string;

  @IsOptional()
  @IsBoolean()
  is_default?: boolean;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

/** Le type d'un emplacement ne change pas (il conditionne les stocks). */
export class UpdateStockLocationDto extends PartialType(
  OmitType(CreateStockLocationDto, ['property_id', 'location_type'] as const),
) {}

export class StockLocationQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsMongoId()
  property_id?: string;

  @IsOptional()
  @IsEnum(StockLocationType)
  location_type?: StockLocationType;
}
