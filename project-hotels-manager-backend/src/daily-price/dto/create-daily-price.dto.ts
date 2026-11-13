import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { MoneyDto } from '../../common/dto/money.dto';
import { DailyPriceSource } from '../schemas/daily-price.entity';

/** DTO de création d'un prix pour une nuit (`setDailyPrice`). */
export class CreateDailyPriceDto {
  @IsMongoId()
  property_id!: string;

  @IsMongoId()
  room_type_id!: string;

  @IsOptional()
  @IsMongoId()
  rate_plan_id?: string;

  @IsDateString()
  date!: string;

  @ValidateNested()
  @Type(() => MoneyDto)
  price!: MoneyDto;

  @IsOptional()
  @IsInt()
  @Min(1)
  min_stay?: number;

  @IsOptional()
  @IsBoolean()
  is_closed?: boolean;

  @IsOptional()
  @IsEnum(DailyPriceSource)
  source?: DailyPriceSource;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
