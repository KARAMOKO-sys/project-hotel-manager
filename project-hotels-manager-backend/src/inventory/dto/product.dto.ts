import { OmitType, PartialType } from '@nestjs/mapped-types';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { Currency } from '../../base-entities/enums/currency.enum';
import {
  ProductCategory,
  ProductType,
  UnitOfMeasure,
} from '../inventory.enums';

export class CreateProductDto {
  @IsMongoId()
  property_id!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  /** Référence interne (unique par établissement). */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  sku?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsEnum(ProductCategory)
  category?: ProductCategory;

  @IsOptional()
  @IsEnum(UnitOfMeasure)
  uom?: UnitOfMeasure;

  @IsOptional()
  @IsEnum(ProductType)
  product_type?: ProductType;

  /**
   * Coût initial (création uniquement). Il est ensuite recalculé par le
   * serveur (coût moyen pondéré) à chaque réception fournisseur.
   */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  cost_price?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  sale_price?: number;

  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @IsOptional()
  @IsNumber()
  @Min(0)
  reorder_min?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  reorder_max?: number;

  @IsOptional()
  @IsMongoId()
  preferred_vendor_id?: string;

  @IsOptional()
  @IsMongoId()
  pos_item_id?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  consumed_per_checkout?: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

/** L'établissement et le coût (géré par le serveur) ne sont pas modifiables. */
export class UpdateProductDto extends PartialType(
  OmitType(CreateProductDto, ['property_id', 'cost_price'] as const),
) {}

export class ProductQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsMongoId()
  property_id?: string;

  @IsOptional()
  @IsEnum(ProductCategory)
  category?: ProductCategory;

  @IsOptional()
  @IsEnum(ProductType)
  product_type?: ProductType;

  @IsOptional()
  @IsMongoId()
  preferred_vendor_id?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  is_active?: boolean;
}

export class PropertyQueryDto {
  @IsMongoId()
  property_id!: string;
}

export class StockLevelQueryDto extends PropertyQueryDto {
  @IsOptional()
  @IsMongoId()
  product_id?: string;

  @IsOptional()
  @IsMongoId()
  location_id?: string;

  @IsOptional()
  @IsEnum(ProductCategory)
  category?: ProductCategory;
}

export class SetupInventoryDto extends PropertyQueryDto {}

export class MovesReportQueryDto extends PropertyQueryDto {
  @IsOptional()
  @IsMongoId()
  product_id?: string;

  @IsOptional()
  @Type(() => Date)
  from?: Date;

  @IsOptional()
  @Type(() => Date)
  to?: Date;
}
