import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsIn,
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
import { SentimentLabel } from '../schemas/sentiment-analysis.entity';
import type { TrendGranularity } from '../engine/sentiment-summary';

/** Texte à analyser sans persistance. */
export class AnalyzeTextDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  text!: string;
}

export class SentimentFilterQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(SentimentLabel)
  label?: SentimentLabel;
}

/** Période d'agrégation (bornes incluses, dates ISO). */
export class SentimentPeriodQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

export class SentimentTrendQueryDto extends SentimentPeriodQueryDto {
  @IsOptional()
  @IsIn(['day', 'week', 'month'])
  granularity?: TrendGranularity;
}

export class SentimentAlertQueryDto {
  /** Score en dessous duquel un avis est remonté (défaut -0,4). */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-1)
  @Max(1)
  threshold?: number;
}

export class AcknowledgeAlertDto {
  @IsOptional()
  @IsMongoId()
  user_id?: string;
}
