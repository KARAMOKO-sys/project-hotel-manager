import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { NotificationChannel } from '../../base-entities/enums/notification-channel.enum';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { NotificationStatus } from '../schemas/notification-log.entity';

export class MarkAsSentDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  provider_message_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  provider?: string;
}

export class MarkAsFailedDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  error_message!: string;
}

export class NotificationLogQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsMongoId()
  property_id?: string;

  @IsOptional()
  @IsEnum(NotificationChannel)
  channel?: NotificationChannel;

  @IsOptional()
  @IsEnum(NotificationStatus)
  status?: NotificationStatus;

  @IsOptional()
  @Transform(({ value }: { value: string }) => value?.trim())
  @IsString()
  template?: string;
}

export class NotificationStatsQueryDto {
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
