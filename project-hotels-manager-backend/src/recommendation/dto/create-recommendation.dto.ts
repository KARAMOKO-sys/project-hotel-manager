import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
  IsDateString,
} from 'class-validator';
import { MoneyDto } from '../../common/dto/money.dto';
import { RecommendationType } from '../schemas/recommendation.entity';

/** Création manuelle d'une recommandation (ex. proposée par le personnel). */
export class CreateRecommendationDto {
  @IsMongoId()
  guest_id!: string;

  @IsMongoId()
  property_id!: string;

  @IsOptional()
  @IsMongoId()
  reservation_id?: string;

  @IsEnum(RecommendationType)
  type!: RecommendationType;

  @IsOptional()
  @IsMongoId()
  item_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  item_type?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => MoneyDto)
  price?: MoneyDto;

  @IsNumber()
  @Min(0)
  @Max(1)
  score!: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  reasons?: string[];

  @IsOptional()
  @IsDateString()
  expires_at?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
