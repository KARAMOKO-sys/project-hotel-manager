import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsMongoId,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { MoneyDto } from '../../common/dto/money.dto';
import { DailyPriceSource } from '../schemas/daily-price.entity';

/** Définition en masse d'un prix sur une plage de dates (bornes incluses). */
export class BulkSetDailyPriceDto {
  @IsMongoId()
  property_id!: string;

  @IsMongoId()
  room_type_id!: string;

  @IsOptional()
  @IsMongoId()
  rate_plan_id?: string;

  @IsDateString()
  start_date!: string;

  @IsDateString()
  end_date!: string;

  @ValidateNested()
  @Type(() => MoneyDto)
  price!: MoneyDto;

  /** Jours concernés (0 = dimanche … 6 = samedi). Vide = tous les jours. */
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  days_of_week?: number[];

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
}

/** Plage de dates (bornes incluses) pour le calendrier des prix. */
export class PriceCalendarQueryDto {
  @IsDateString()
  start_date!: string;

  @IsDateString()
  end_date!: string;

  @IsOptional()
  @IsMongoId()
  rate_plan_id?: string;
}

/** Séjour (départ exclu) pour le calcul du prix total. */
export class StayPriceQueryDto {
  @IsDateString()
  check_in!: string;

  @IsDateString()
  check_out!: string;

  @IsOptional()
  @IsMongoId()
  rate_plan_id?: string;
}
