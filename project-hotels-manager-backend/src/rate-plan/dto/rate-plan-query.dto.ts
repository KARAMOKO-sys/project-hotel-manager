import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';
import { BookingChannel } from '../../base-entities/enums/booking-channel.enum';

/** Critères de recherche des plans applicables à un séjour. */
export class ApplicableRatePlansQueryDto {
  @IsOptional()
  @IsMongoId()
  room_type_id?: string;

  @IsDateString()
  check_in!: string;

  @IsDateString()
  check_out!: string;

  @IsOptional()
  @IsEnum(BookingChannel)
  channel?: BookingChannel;
}

/** Données de calcul des frais d'annulation. */
export class CancellationFeeDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  total_amount!: number;

  @IsDateString()
  check_in!: string;

  @IsOptional()
  @IsDateString()
  cancelled_at?: string;
}
