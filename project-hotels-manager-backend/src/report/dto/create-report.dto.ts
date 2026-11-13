import {
  IsArray,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ReportFormat, ReportType } from '../schemas/report.entity';

/**
 * Définition d'un rapport. Pour les types `daily`, `monthly` et `annual`,
 * la période peut être omise : elle est déduite de `reference_date`
 * (par défaut aujourd'hui).
 */
export class CreateReportDto {
  @IsMongoId()
  property_id!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsEnum(ReportType)
  type!: ReportType;

  @IsOptional()
  @IsDateString()
  period_start?: string;

  @IsOptional()
  @IsDateString()
  period_end?: string;

  @IsOptional()
  @IsDateString()
  reference_date?: string;

  @IsOptional()
  @IsEnum(ReportFormat)
  format?: ReportFormat;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  columns?: string[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
