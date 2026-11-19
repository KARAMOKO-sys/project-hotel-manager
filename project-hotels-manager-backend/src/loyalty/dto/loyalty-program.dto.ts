import { OmitType, PartialType } from '@nestjs/mapped-types';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
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
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { Currency } from '../../base-entities/enums/currency.enum';
import { LoyaltyTier } from '../../base-entities/enums/loyalty-tier.enum';

export class LoyaltyTierRuleDto {
  @IsEnum(LoyaltyTier)
  tier!: LoyaltyTier;

  @IsInt()
  @Min(0)
  min_lifetime_points!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(20)
  earn_multiplier?: number;
}

export class CreateLoyaltyProgramDto {
  /** Programme d'un établissement… */
  @IsOptional()
  @IsMongoId()
  property_id?: string;

  /** …ou de toute l'organisation (exactement l'un des deux). */
  @IsOptional()
  @IsMongoId()
  organization_id?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  earn_unit_amount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  points_per_unit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  point_value?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  min_redeem_points?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(120)
  points_expiry_months?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LoyaltyTierRuleDto)
  tiers?: LoyaltyTierRuleDto[];

  @IsOptional()
  @IsBoolean()
  earn_on_reservation?: boolean;

  @IsOptional()
  @IsBoolean()
  earn_on_pos?: boolean;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}

export class UpdateLoyaltyProgramDto extends PartialType(
  OmitType(CreateLoyaltyProgramDto, [
    'property_id',
    'organization_id',
  ] as const),
) {}

export class LoyaltyProgramQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsMongoId()
  property_id?: string;

  @IsOptional()
  @IsMongoId()
  organization_id?: string;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  is_active?: boolean;
}
