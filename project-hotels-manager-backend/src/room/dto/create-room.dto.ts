import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';
import { RoomStatus } from '../../base-entities/enums/room-status.enum';

export class CreateRoomDto {
  @IsMongoId()
  property_id!: string;

  @IsMongoId()
  room_type_id!: string;

  @IsString()
  @Length(1, 20)
  number!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  floor?: number;

  @IsOptional()
  @IsEnum(RoomStatus)
  status?: RoomStatus;

  @IsOptional()
  @IsInt()
  @Min(1)
  max_occupancy?: number;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  amenities?: string[];

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
