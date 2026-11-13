import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  MAX_ADJUSTMENT_PERCENT,
  MIN_ADJUSTMENT_PERCENT,
  PricingRuleType,
} from '../schemas/dynamic-pricing-rule.entity';

/** DTO de création d'une règle de tarification dynamique (`createRule`). */
export class CreateDynamicPricingRuleDto {
  @IsMongoId()
  property_id!: string;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  room_type_ids?: string[];

  @IsString()
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsEnum(PricingRuleType)
  rule_type!: PricingRuleType;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(MIN_ADJUSTMENT_PERCENT)
  @Max(MAX_ADJUSTMENT_PERCENT)
  adjustment_percent!: number;

  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  days_before_arrival?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  occupancy_threshold?: number;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  days_of_week?: number[];

  @IsOptional()
  @IsInt()
  priority?: number;

  /** Ignoré si la règle requiert une validation (> 25 %). */
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
