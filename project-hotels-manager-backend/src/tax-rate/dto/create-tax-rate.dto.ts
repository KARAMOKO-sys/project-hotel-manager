import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Currency } from '../../base-entities/enums/currency.enum';
import {
  TaxAppliesTo,
  TaxCalculationType,
  TaxFixedBasis,
  TaxType,
} from '../schemas/tax-rate.entity';

/** DTO de création d'un taux de taxe (TVA, taxe de séjour…). */
export class CreateTaxRateDto {
  @IsMongoId()
  property_id!: string;

  @IsString()
  @MaxLength(100)
  name!: string;

  @IsString()
  @MaxLength(30)
  code!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsEnum(TaxType)
  tax_type?: TaxType;

  @IsOptional()
  @IsEnum(TaxCalculationType)
  calculation_type?: TaxCalculationType;

  /** Pourcentage (0–100) ou montant fixe selon `calculation_type`. */
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  rate!: number;

  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @IsOptional()
  @IsEnum(TaxFixedBasis)
  fixed_basis?: TaxFixedBasis;

  @IsOptional()
  @IsEnum(TaxAppliesTo)
  applies_to?: TaxAppliesTo;

  @IsOptional()
  @IsBoolean()
  is_inclusive?: boolean;

  @IsOptional()
  @IsInt()
  priority?: number;

  @IsOptional()
  @IsDateString()
  valid_from?: string;

  @IsOptional()
  @IsDateString()
  valid_to?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
