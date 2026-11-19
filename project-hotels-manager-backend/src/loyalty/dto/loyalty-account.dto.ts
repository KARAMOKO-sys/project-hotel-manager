import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  NotEquals,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { LoyaltyTier } from '../../base-entities/enums/loyalty-tier.enum';

export class EnrollLoyaltyAccountDto {
  @IsMongoId()
  program_id!: string;

  @IsMongoId()
  guest_id!: string;
}

export class RedeemPointsDto {
  @IsInt()
  @Min(1)
  points!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}

export class AdjustPointsDto {
  /** Signé : positif = crédit, négatif = débit. */
  @IsInt()
  @NotEquals(0)
  points!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}

export class LoyaltyAccountQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsMongoId()
  program_id?: string;

  @IsOptional()
  @IsMongoId()
  guest_id?: string;

  @IsOptional()
  @IsMongoId()
  property_id?: string;

  @IsOptional()
  @IsEnum(LoyaltyTier)
  tier?: LoyaltyTier;
}

export class StatementQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
