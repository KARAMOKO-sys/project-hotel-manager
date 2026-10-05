import { PartialType } from '@nestjs/mapped-types';
import { CreateReservationRoomDto } from './create-reservation-room.dto';

export class UpdateReservationRoomDto extends PartialType(
  CreateReservationRoomDto,
) {}
