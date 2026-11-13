import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
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
import { Currency } from '../../base-entities/enums/currency.enum';
import { RecommendationType } from '../schemas/recommendation.entity';

export class GuestProfileDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferences?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  past_categories?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  average_spend?: number;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  stay_purpose?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excluded_categories?: string[];
}

export class RecommendationCandidateDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @IsEnum(RecommendationType)
  type!: RecommendationType;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsMongoId()
  item_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  item_type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}

/** Calcul de scores sans persistance. */
export class ScoreCandidatesDto {
  @ValidateNested()
  @Type(() => GuestProfileDto)
  profile!: GuestProfileDto;

  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => RecommendationCandidateDto)
  candidates!: RecommendationCandidateDto[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  min_score?: number;
}

/** Génération et enregistrement des meilleures recommandations d'un client. */
export class GenerateRecommendationsDto extends ScoreCandidatesDto {
  @IsMongoId()
  guest_id!: string;

  @IsMongoId()
  property_id!: string;

  @IsOptional()
  @IsMongoId()
  reservation_id?: string;

  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  /** Durée de validité en jours (défaut 7). */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  ttl_days?: number;
}
