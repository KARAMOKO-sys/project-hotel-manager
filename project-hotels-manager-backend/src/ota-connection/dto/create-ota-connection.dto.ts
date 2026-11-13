import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { OtaProvider } from '../schemas/ota-connection.entity';

export class OtaRoomMappingDto {
  @IsMongoId()
  room_type_id!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  ota_room_type_id!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  ota_rate_plan_id?: string;
}

export class CreateOtaConnectionDto {
  @IsMongoId()
  property_id!: string;

  @IsEnum(OtaProvider)
  provider!: OtaProvider;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  ota_property_id!: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  display_name?: string;

  /** Identifiants d'API (api_key, username, password…). */
  @IsOptional()
  @IsObject()
  credentials?: Record<string, string>;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OtaRoomMappingDto)
  room_mappings?: OtaRoomMappingDto[];

  @IsOptional()
  @IsBoolean()
  sync_availability?: boolean;

  @IsOptional()
  @IsBoolean()
  sync_rates?: boolean;

  @IsOptional()
  @IsBoolean()
  sync_reservations?: boolean;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  commission_rate?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
