import { Type } from 'class-transformer';
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
  ValidateNested,
} from 'class-validator';
import { MoneyDto } from '../../common/dto/money.dto';
import { BookingChannel } from '../../base-entities/enums/booking-channel.enum';
import { CancellationPolicyType, MealPlan } from '../schemas/rate-plan.entity';

export class CancellationPolicyDto {
  @IsEnum(CancellationPolicyType)
  type!: CancellationPolicyType;

  @IsOptional()
  @IsInt()
  @Min(0)
  free_cancellation_hours?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  penalty_percent?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}

/** DTO de création d'un plan tarifaire (`createRatePlan`). */
export class CreateRatePlanDto {
  @IsMongoId()
  property_id!: string;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  room_type_ids?: string[];

  @IsString()
  @MaxLength(100)
  name!: string;

  @IsString()
  @MaxLength(50)
  code!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ValidateNested()
  @Type(() => MoneyDto)
  base_price!: MoneyDto;

  @IsOptional()
  @IsEnum(MealPlan)
  meal_plan?: MealPlan;

  @IsOptional()
  @ValidateNested()
  @Type(() => CancellationPolicyDto)
  cancellation_policy?: CancellationPolicyDto;

  @IsOptional()
  @IsInt()
  @Min(1)
  min_stay?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  max_stay?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  min_advance_days?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  max_advance_days?: number;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  arrival_days?: number[];

  @IsOptional()
  @IsArray()
  @IsEnum(BookingChannel, { each: true })
  channels?: BookingChannel[];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  conditions?: string;

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
