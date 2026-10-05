import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseCrudService } from '../../common/services/base-crud.service';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import {
  ReservationRoom,
  ReservationRoomDocument,
} from '../schemas/reservation-room.entity';
import { CreateReservationRoomDto } from '../dto/create-reservation-room.dto';
import { UpdateReservationRoomDto } from '../dto/update-reservation-room.dto';

/**
 * Service de gestion du lien réservation ↔ chambre.
 */
@Injectable()
export class ReservationRoomService extends BaseCrudService<
  ReservationRoom,
  CreateReservationRoomDto,
  UpdateReservationRoomDto
> {
  constructor(
    @InjectModel(ReservationRoom.name)
    protected readonly reservationRoomModel: Model<ReservationRoomDocument>,
  ) {
    super(reservationRoomModel, ReservationRoom.name);
  }

  /** Liste les chambres rattachées à une réservation. */
  findByReservation(reservationId: string, query: PaginationQueryDto) {
    return this.findAll(query, {
      reservation_id: new Types.ObjectId(reservationId),
    });
  }
}
