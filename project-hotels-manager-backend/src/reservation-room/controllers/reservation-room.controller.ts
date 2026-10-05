import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ReservationRoomService } from '../services/reservation-room.service';
import { CreateReservationRoomDto } from '../dto/create-reservation-room.dto';
import { UpdateReservationRoomDto } from '../dto/update-reservation-room.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { IdParamDto } from '../../common/dto/id-param.dto';

@Controller('reservation-rooms')
export class ReservationRoomController {
  constructor(
    private readonly reservationRoomService: ReservationRoomService,
  ) {}

  @Post()
  create(@Body() createReservationRoomDto: CreateReservationRoomDto) {
    return this.reservationRoomService.create(createReservationRoomDto);
  }

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.reservationRoomService.findAll(query);
  }

  @Get('reservation/:reservationId')
  findByReservation(
    @Param('reservationId') reservationId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.reservationRoomService.findByReservation(reservationId, query);
  }

  @Get(':id')
  findOne(@Param() params: IdParamDto) {
    return this.reservationRoomService.findOne(params.id);
  }

  @Patch(':id')
  update(
    @Param() params: IdParamDto,
    @Body() updateReservationRoomDto: UpdateReservationRoomDto,
  ) {
    return this.reservationRoomService.update(
      params.id,
      updateReservationRoomDto,
    );
  }

  @Delete(':id')
  remove(@Param() params: IdParamDto) {
    return this.reservationRoomService.remove(params.id);
  }
}
