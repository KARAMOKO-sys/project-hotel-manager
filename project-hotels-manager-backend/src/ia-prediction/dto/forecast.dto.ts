import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
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
import {
  ForecastMethod,
  PredictionStatus,
  PredictionType,
} from '../schemas/ia-prediction.entity';

/**
 * Demande de prévision à partir d'un historique journalier fourni par
 * l'appelant (du plus ancien au plus récent).
 */
export class ForecastDto {
  @IsMongoId()
  property_id!: string;

  @IsEnum(PredictionType)
  type!: PredictionType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  target!: string;

  @IsOptional()
  @IsMongoId()
  target_id?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(1095)
  @IsNumber({}, { each: true })
  history!: number[];

  /** Nombre de jours à prévoir (défaut 7). */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  horizon?: number;

  @IsOptional()
  @IsEnum(ForecastMethod)
  method?: ForecastMethod;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(90)
  window?: number;

  /** Date du premier point prévu (défaut : demain). */
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsNumber()
  min_value?: number;

  @IsOptional()
  @IsNumber()
  max_value?: number;

  /** `false` pour un simple aperçu sans enregistrement. */
  @IsOptional()
  @IsBoolean()
  persist?: boolean;
}

export class RecordActualDto {
  @IsNumber()
  actual_value!: number;
}

export class PredictionFilterQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(PredictionType)
  type?: PredictionType;

  @IsOptional()
  @IsEnum(PredictionStatus)
  status?: PredictionStatus;
}

export class AccuracyQueryDto {
  @IsOptional()
  @IsMongoId()
  property_id?: string;

  @IsOptional()
  @IsEnum(PredictionType)
  type?: PredictionType;

  @IsOptional()
  @IsEnum(ForecastMethod)
  method?: ForecastMethod;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  model_version?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

export class PendingEvaluationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;
}
