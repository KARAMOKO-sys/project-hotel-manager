import {
  IsDateString,
  IsEnum,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { WaitlistStatus } from '../schemas/waitlist.entity';

/** Pagination + filtre optionnel par statut. */
export class WaitlistQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(WaitlistStatus)
  status?: WaitlistStatus;
}

/** Disponibilité libérée à proposer aux clients en attente. */
export class NotifyAvailabilityDto {
  @IsOptional()
  @IsMongoId()
  room_type_id?: string;

  @IsDateString()
  start_date!: string;

  @IsDateString()
  end_date!: string;

  /** Nombre maximum de clients à notifier (= chambres libérées). */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}

/** Rattache l'entrée à la réservation créée. */
export class ConvertWaitlistDto {
  @IsMongoId()
  reservation_id!: string;
}

export class CancelWaitlistDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
