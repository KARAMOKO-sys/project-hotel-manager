import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmptyObject,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { OtaRoomMappingDto } from './create-ota-connection.dto';

export class UpdateOtaCredentialsDto {
  @IsObject()
  @IsNotEmptyObject()
  credentials!: Record<string, string>;
}

export class SetRoomMappingsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OtaRoomMappingDto)
  room_mappings!: OtaRoomMappingDto[];
}

export class OtaSyncStatsDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  reservations_imported?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  availability_updates?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  rate_updates?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  error_count?: number;
}

/** Résultat d'une synchronisation rapporté par le worker d'intégration. */
export class RecordSyncDto {
  @IsBoolean()
  success!: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => OtaSyncStatsDto)
  stats?: OtaSyncStatsDto;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  error?: string;
}
