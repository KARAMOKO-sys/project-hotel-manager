import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Min,
  ValidateNested,
} from 'class-validator';
import { Currency } from '../../base-entities/enums/currency.enum';

class MoneyDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount!: number;

  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;
}

export class CreateRoomTypeDto {
  @IsMongoId()
  property_id!: string;

  @IsString()
  @Length(2, 100)
  name!: string;

  @IsString()
  @Length(2, 50)
  code!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @ValidateNested()
  @Type(() => MoneyDto)
  base_price!: MoneyDto;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity_adults?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  capacity_children?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  total_rooms?: number;

  @IsOptional()
  @IsString()
  bed_type?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  size_sqm?: number;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  amenities?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
