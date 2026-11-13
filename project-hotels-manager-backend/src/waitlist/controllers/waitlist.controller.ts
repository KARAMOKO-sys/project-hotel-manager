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
import { WaitlistService } from '../services/waitlist.service';
import { CreateWaitlistDto } from '../dto/create-waitlist.dto';
import { UpdateWaitlistDto } from '../dto/update-waitlist.dto';
import {
  CancelWaitlistDto,
  ConvertWaitlistDto,
  NotifyAvailabilityDto,
  WaitlistQueryDto,
} from '../dto/waitlist-actions.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { IdParamDto } from '../../common/dto/id-param.dto';

@Controller('waitlist')
export class WaitlistController {
  constructor(private readonly waitlistService: WaitlistService) {}

  @Post()
  create(@Body() createWaitlistDto: CreateWaitlistDto) {
    return this.waitlistService.create(createWaitlistDto);
  }

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.waitlistService.findAll(query);
  }

  @Post('expire-overdue')
  expireOverdue() {
    return this.waitlistService.expireOverdue();
  }

  @Get('property/:propertyId')
  findByProperty(
    @Param('propertyId') propertyId: string,
    @Query() query: WaitlistQueryDto,
  ) {
    return this.waitlistService.findByProperty(propertyId, query, query.status);
  }

  @Get('property/:propertyId/statistics')
  getStatistics(@Param('propertyId') propertyId: string) {
    return this.waitlistService.getStatistics(propertyId);
  }

  @Post('property/:propertyId/notify')
  notifyAvailable(
    @Param('propertyId') propertyId: string,
    @Body() dto: NotifyAvailabilityDto,
  ) {
    return this.waitlistService.notifyAvailable(propertyId, dto);
  }

  @Get('guest/:guestId')
  findByGuest(
    @Param('guestId') guestId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.waitlistService.findByGuest(guestId, query);
  }

  @Get(':id')
  findOne(@Param() params: IdParamDto) {
    return this.waitlistService.findOne(params.id);
  }

  @Get(':id/position')
  getPosition(@Param() params: IdParamDto) {
    return this.waitlistService.getPosition(params.id);
  }

  @Patch(':id')
  update(
    @Param() params: IdParamDto,
    @Body() updateWaitlistDto: UpdateWaitlistDto,
  ) {
    return this.waitlistService.update(params.id, updateWaitlistDto);
  }

  @Patch(':id/confirm')
  confirm(@Param() params: IdParamDto) {
    return this.waitlistService.confirm(params.id);
  }

  @Patch(':id/convert')
  convert(@Param() params: IdParamDto, @Body() dto: ConvertWaitlistDto) {
    return this.waitlistService.convertToReservation(
      params.id,
      dto.reservation_id,
    );
  }

  @Patch(':id/cancel')
  cancel(@Param() params: IdParamDto, @Body() dto: CancelWaitlistDto) {
    return this.waitlistService.cancel(params.id, dto.reason);
  }

  @Delete(':id')
  remove(@Param() params: IdParamDto) {
    return this.waitlistService.remove(params.id);
  }
}
