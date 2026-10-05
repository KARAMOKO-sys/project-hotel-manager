import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsMongoId,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { BookingChannel } from '../../base-entities/enums/booking-channel.enum';
import { ReservationSource } from '../../base-entities/enums/reservation-source.enum';
import { MoneyDto } from '../../common/dto/money.dto';

export class CreateReservationDto {
  @IsMongoId()
  property_id!: string;

  @IsMongoId()
  guest_id!: string;

  @IsMongoId()
  room_type_id!: string;

  @IsDateString()
  check_in!: string;

  @IsDateString()
  check_out!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  adults?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  children?: number;

  @IsOptional()
  @IsEnum(ReservationSource)
  source?: ReservationSource;

  @IsOptional()
  @IsEnum(BookingChannel)
  channel?: BookingChannel;

  @IsOptional()
  @ValidateNested()
  @Type(() => MoneyDto)
  total_amount?: MoneyDto;

  @IsOptional()
  @IsString()
  special_requests?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
