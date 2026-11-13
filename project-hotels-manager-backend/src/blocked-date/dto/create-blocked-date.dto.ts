import {
  IsDateString,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { BlockReason } from '../schemas/blocked-date.entity';

/**
 * DTO de blocage d'une période.
 * Sans `room_id` ni `room_type_id`, toute la propriété est bloquée.
 */
export class CreateBlockedDateDto {
  @IsMongoId()
  property_id!: string;

  @IsOptional()
  @IsMongoId()
  room_id?: string;

  @IsOptional()
  @IsMongoId()
  room_type_id?: string;

  @IsDateString()
  start_date!: string;

  @IsDateString()
  end_date!: string;

  @IsOptional()
  @IsEnum(BlockReason)
  reason?: BlockReason;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @IsMongoId()
  blocked_by?: string;
}
