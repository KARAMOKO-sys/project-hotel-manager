import { IsDateString, IsMongoId, IsOptional } from 'class-validator';

/** Filtre de période (query string) pour la consultation des blocages. */
export class BlockedDateRangeQueryDto {
  @IsDateString()
  start_date!: string;

  @IsDateString()
  end_date!: string;

  @IsOptional()
  @IsMongoId()
  room_id?: string;

  @IsOptional()
  @IsMongoId()
  room_type_id?: string;
}
