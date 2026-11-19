import {
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { OutboxStatus } from '../schemas/outbox-message.entity';

export class OutboxQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsMongoId()
  organization_id?: string;

  @IsOptional()
  @IsMongoId()
  property_id?: string;

  @IsOptional()
  @IsEnum(OutboxStatus)
  status?: OutboxStatus;

  @IsOptional()
  @IsMongoId()
  endpoint_id?: string;

  /** Nom exact de l'événement. */
  @IsOptional()
  @IsString()
  @MaxLength(150)
  event?: string;

  /** Identifiant de l'événement métier. */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  event_id?: string;
}
