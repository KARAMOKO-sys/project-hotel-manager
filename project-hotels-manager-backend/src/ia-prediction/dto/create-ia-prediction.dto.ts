import {
  IsDateString,
  IsEnum,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  ForecastMethod,
  PredictionType,
} from '../schemas/ia-prediction.entity';

/** Enregistrement manuel d'une prédiction (ou import depuis un système externe). */
export class CreateIaPredictionDto {
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

  @IsDateString()
  target_date!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  horizon_days?: number;

  @IsNumber()
  predicted_value!: number;

  @IsOptional()
  @IsNumber()
  lower_bound?: number;

  @IsOptional()
  @IsNumber()
  upper_bound?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence?: number;

  @IsOptional()
  @IsEnum(ForecastMethod)
  method?: ForecastMethod;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  model_version?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
