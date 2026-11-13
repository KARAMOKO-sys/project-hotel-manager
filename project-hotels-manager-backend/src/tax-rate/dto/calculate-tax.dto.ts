import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';
import { TaxAppliesTo } from '../schemas/tax-rate.entity';

/** Données de calcul des taxes sur un montant. */
export class CalculateTaxDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  nights?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  guests?: number;

  /** Date d'application (validité des taux). Défaut : maintenant. */
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsEnum(TaxAppliesTo)
  applies_to?: TaxAppliesTo;
}

/** Filtre des taxes applicables. */
export class ApplicableTaxesQueryDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsEnum(TaxAppliesTo)
  applies_to?: TaxAppliesTo;
}
