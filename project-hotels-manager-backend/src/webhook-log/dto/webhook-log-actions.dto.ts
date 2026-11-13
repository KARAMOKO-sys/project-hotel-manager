import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { WebhookProvider, WebhookStatus } from '../schemas/webhook-log.entity';

export class MarkWebhookProcessedDto {
  @IsOptional()
  @IsObject()
  result?: Record<string, any>;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  related_entity_type?: string;

  @IsOptional()
  @IsMongoId()
  related_entity_id?: string;
}

export class MarkWebhookFailedDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  error_message!: string;
}

export class VerifySignatureDto {
  @IsBoolean()
  verified!: boolean;
}

export class WebhookLogQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(WebhookProvider)
  provider?: WebhookProvider;

  @IsOptional()
  @IsEnum(WebhookStatus)
  status?: WebhookStatus;

  @IsOptional()
  @IsString()
  event_type?: string;

  @IsOptional()
  @IsMongoId()
  property_id?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

export class IgnoreWebhookDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
