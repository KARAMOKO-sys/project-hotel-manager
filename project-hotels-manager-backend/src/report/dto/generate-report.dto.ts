import { IntersectionType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsMongoId,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { CreateReportDto } from './create-report.dto';
import {
  ReportFormat,
  ReportRecurrence,
  ReportStatus,
  ReportType,
} from '../schemas/report.entity';

/** Données tabulaires fournies pour générer le rapport. */
export class GenerateReportDto {
  @IsArray()
  @ArrayMaxSize(50000)
  @IsObject({ each: true })
  rows!: Record<string, unknown>[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  columns?: string[];

  @IsOptional()
  @IsMongoId()
  generated_by?: string;
}

/** Création et génération en une seule requête. */
export class CreateAndGenerateReportDto extends IntersectionType(
  CreateReportDto,
  GenerateReportDto,
) {}

export class ScheduleReportDto {
  @IsEnum(ReportRecurrence)
  recurrence!: ReportRecurrence;

  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  recipients?: string[];

  /** Première exécution (défaut : maintenant + une récurrence). */
  @IsOptional()
  @IsDateString()
  start_at?: string;
}

export class ExportReportQueryDto {
  @IsOptional()
  @IsEnum(ReportFormat)
  format?: ReportFormat;
}

export class ReportFilterQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(ReportType)
  type?: ReportType;

  @IsOptional()
  @IsEnum(ReportStatus)
  status?: ReportStatus;
}

export class DueReportsQueryDto {
  @IsOptional()
  @Type(() => String)
  @IsDateString()
  at?: string;
}
