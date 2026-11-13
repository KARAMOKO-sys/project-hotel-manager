import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsObject,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';
import { Currency } from '../../base-entities/enums/currency.enum';
import { KpiPeriodType } from '../schemas/kpi.entity';

/** Données brutes nécessaires au calcul des indicateurs. */
export class KpiInputDto {
  @IsNumber()
  @Min(0)
  rooms_available!: number;

  @IsNumber()
  @Min(0)
  rooms_sold!: number;

  @IsNumber()
  @Min(0)
  room_revenue!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  total_revenue?: number;

  /** Peut être négatif (exploitation déficitaire). */
  @IsOptional()
  @IsNumber()
  gross_operating_profit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  reservations_count?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cancellations_count?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stays_count?: number;
}

/** Création d'un instantané : les indicateurs sont calculés côté serveur. */
export class CreateKpiDto extends KpiInputDto {
  @IsMongoId()
  property_id!: string;

  @IsEnum(KpiPeriodType)
  period_type!: KpiPeriodType;

  @IsDateString()
  period_start!: string;

  @IsDateString()
  period_end!: string;

  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @IsOptional()
  @IsNumber()
  @Min(0)
  guests_count?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/** Comparaison de deux périodes fournies en entrée (sans persistance). */
export class ComparePeriodsDto {
  @ValidateNested()
  @Type(() => KpiInputDto)
  current!: KpiInputDto;

  @ValidateNested()
  @Type(() => KpiInputDto)
  previous!: KpiInputDto;
}
