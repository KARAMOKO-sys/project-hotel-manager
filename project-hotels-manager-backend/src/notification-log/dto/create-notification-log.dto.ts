import {
  IsEnum,
  IsInt,
  IsMongoId,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { NotificationChannel } from '../../base-entities/enums/notification-channel.enum';
import { NotificationRecipientType } from '../schemas/notification-log.entity';

export class CreateNotificationLogDto {
  @IsOptional()
  @IsMongoId()
  property_id?: string;

  @IsOptional()
  @IsMongoId()
  recipient_id?: string;

  @IsOptional()
  @IsEnum(NotificationRecipientType)
  recipient_type?: NotificationRecipientType;

  @IsOptional()
  @IsString()
  @MaxLength(320)
  recipient_address?: string;

  @IsEnum(NotificationChannel)
  channel!: NotificationChannel;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  template?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  subject?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  body?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  provider?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  max_retries?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  related_entity_type?: string;

  @IsOptional()
  @IsMongoId()
  related_entity_id?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
