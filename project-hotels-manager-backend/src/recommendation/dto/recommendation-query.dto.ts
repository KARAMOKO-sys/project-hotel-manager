import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import {
  RecommendationStatus,
  RecommendationType,
} from '../schemas/recommendation.entity';

export class RecommendationFilterQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(RecommendationStatus)
  status?: RecommendationStatus;

  @IsOptional()
  @IsEnum(RecommendationType)
  type?: RecommendationType;
}

export class ConversionStatsQueryDto {
  @IsOptional()
  @IsMongoId()
  property_id?: string;

  @IsOptional()
  @IsMongoId()
  guest_id?: string;

  @IsOptional()
  @IsEnum(RecommendationType)
  type?: RecommendationType;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

export class AcceptRecommendationDto {
  /** Montant réellement encaissé (défaut : prix de la recommandation). */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  revenue?: number;
}

export class DismissRecommendationDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
