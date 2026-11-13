import {
  IsEnum,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  ReviewSource,
  SentimentLanguage,
} from '../schemas/sentiment-analysis.entity';

/**
 * Avis à analyser puis enregistrer. Le score, le libellé, les aspects et les
 * émotions sont calculés par le service, jamais fournis par le client.
 */
export class CreateSentimentAnalysisDto {
  @IsMongoId()
  property_id!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  text!: string;

  @IsOptional()
  @IsEnum(ReviewSource)
  source?: ReviewSource;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  source_ref?: string;

  @IsOptional()
  @IsMongoId()
  guest_id?: string;

  @IsOptional()
  @IsMongoId()
  reservation_id?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsEnum(SentimentLanguage)
  language?: SentimentLanguage;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
