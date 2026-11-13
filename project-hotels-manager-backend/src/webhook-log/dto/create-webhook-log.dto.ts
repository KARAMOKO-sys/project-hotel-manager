import {
  IsBoolean,
  IsEnum,
  IsIP,
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
import { WebhookProvider } from '../schemas/webhook-log.entity';

export class CreateWebhookLogDto {
  @IsEnum(WebhookProvider)
  provider!: WebhookProvider;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  event_type!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  event_id?: string;

  @IsOptional()
  @IsMongoId()
  property_id?: string;

  @IsObject()
  payload!: Record<string, any>;

  @IsOptional()
  @IsObject()
  headers?: Record<string, any>;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  signature?: string;

  @IsOptional()
  @IsBoolean()
  signature_verified?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  max_attempts?: number;

  @IsOptional()
  @IsIP()
  ip_address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  related_entity_type?: string;

  @IsOptional()
  @IsMongoId()
  related_entity_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
