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
import { ReservationService } from '../services/reservation.service';
import { CreateReservationDto } from '../dto/create-reservation.dto';
import { UpdateReservationDto } from '../dto/update-reservation.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { IdParamDto } from '../../common/dto/id-param.dto';

@Controller('reservations')
export class ReservationController {
  constructor(private readonly reservationService: ReservationService) {}

  @Post()
  create(@Body() createReservationDto: CreateReservationDto) {
    return this.reservationService.create(createReservationDto);
  }

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.reservationService.findAll(query);
  }

  @Get('code/:code')
  findByConfirmationCode(@Param('code') code: string) {
    return this.reservationService.findByConfirmationCode(code);
  }

  @Get('guest/:guestId')
  findByGuest(
    @Param('guestId') guestId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.reservationService.findByGuest(guestId, query);
  }

  @Get('property/:propertyId/arrivals')
  getUpcomingArrivals(
    @Param('propertyId') propertyId: string,
    @Query('days') days?: number,
  ) {
    return this.reservationService.getUpcomingArrivals(propertyId, days);
  }

  @Get('property/:propertyId/departures')
  getDepartures(
    @Param('propertyId') propertyId: string,
    @Query('date') date?: string,
  ) {
    return this.reservationService.getDepartures(
      propertyId,
      date ? new Date(date) : undefined,
    );
  }

  @Get(':id')
  findOne(@Param() params: IdParamDto) {
    return this.reservationService.findOne(params.id);
  }

  @Patch(':id')
  update(
    @Param() params: IdParamDto,
    @Body() updateReservationDto: UpdateReservationDto,
  ) {
    return this.reservationService.update(params.id, updateReservationDto);
  }

  @Patch(':id/confirm')
  confirm(@Param() params: IdParamDto) {
    return this.reservationService.confirm(params.id);
  }

  @Patch(':id/cancel')
  cancel(@Param() params: IdParamDto, @Body() body: { reason?: string }) {
    return this.reservationService.cancel(params.id, body.reason);
  }

  @Patch(':id/check-in')
  checkIn(@Param() params: IdParamDto) {
    return this.reservationService.checkIn(params.id);
  }

  @Patch(':id/check-out')
  checkOut(@Param() params: IdParamDto) {
    return this.reservationService.checkOut(params.id);
  }

  @Patch(':id/no-show')
  markAsNoShow(@Param() params: IdParamDto) {
    return this.reservationService.markAsNoShow(params.id);
  }

  @Delete(':id')
  remove(@Param() params: IdParamDto) {
    return this.reservationService.remove(params.id);
  }
}
