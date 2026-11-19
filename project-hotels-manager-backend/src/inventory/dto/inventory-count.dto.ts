import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { InventoryCountState } from '../inventory.enums';

export class InventoryCountLineDto {
  @IsMongoId()
  product_id!: string;

  @IsMongoId()
  location_id!: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  counted_qty?: number;
}

export class CreateInventoryCountDto {
  @IsMongoId()
  property_id!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @IsOptional()
  @IsDateString()
  count_date?: string;

  /**
   * Pré-remplit les lignes avec tous les articles stockés dans cet
   * emplacement interne (en plus des lignes fournies).
   */
  @IsOptional()
  @IsMongoId()
  location_id?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(2000)
  @ValidateNested({ each: true })
  @Type(() => InventoryCountLineDto)
  lines?: InventoryCountLineDto[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

/** Saisie des quantités comptées (brouillon uniquement). */
export class UpdateInventoryCountDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(2000)
  @ValidateNested({ each: true })
  @Type(() => InventoryCountLineDto)
  lines?: InventoryCountLineDto[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class InventoryCountQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsMongoId()
  property_id?: string;

  @IsOptional()
  @IsEnum(InventoryCountState)
  state?: InventoryCountState;
}
