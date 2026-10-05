import { Type } from 'class-transformer';
import {
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { MoneyDto } from '../../common/dto/money.dto';

export class CreateReservationRoomDto {
  @IsMongoId()
  reservation_id!: string;

  @IsMongoId()
  room_id!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => MoneyDto)
  rate?: MoneyDto;

  @IsOptional()
  @IsInt()
  @Min(1)
  guests?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
