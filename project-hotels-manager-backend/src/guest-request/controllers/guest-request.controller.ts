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
import { GuestRequestService } from '../services/guest-request.service';
import { CreateGuestRequestDto } from '../dto/create-guest-request.dto';
import { UpdateGuestRequestDto } from '../dto/update-guest-request.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { IdParamDto } from '../../common/dto/id-param.dto';

@Controller('guest-requests')
export class GuestRequestController {
  constructor(private readonly guestRequestService: GuestRequestService) {}

  @Post()
  create(@Body() createGuestRequestDto: CreateGuestRequestDto) {
    return this.guestRequestService.create(createGuestRequestDto);
  }

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.guestRequestService.findAll(query);
  }

  @Get('guest/:guestId')
  getRequestsByGuest(@Param('guestId') guestId: string) {
    return this.guestRequestService.getRequestsByGuest(guestId);
  }

  @Get('room/:roomId')
  getRequestsByRoom(@Param('roomId') roomId: string) {
    return this.guestRequestService.getRequestsByRoom(roomId);
  }

  @Get('property/:propertyId/pending')
  getPendingRequests(@Param('propertyId') propertyId: string) {
    return this.guestRequestService.getPendingRequests(propertyId);
  }

  @Get(':id')
  findOne(@Param() params: IdParamDto) {
    return this.guestRequestService.findOne(params.id);
  }

  @Patch(':id')
  update(
    @Param() params: IdParamDto,
    @Body() updateGuestRequestDto: UpdateGuestRequestDto,
  ) {
    return this.guestRequestService.update(params.id, updateGuestRequestDto);
  }

  @Patch(':id/assign')
  assign(@Param() params: IdParamDto, @Body() body: { staff_id: string }) {
    return this.guestRequestService.assign(params.id, body.staff_id);
  }

  @Patch(':id/complete')
  complete(@Param() params: IdParamDto) {
    return this.guestRequestService.complete(params.id);
  }

  @Patch(':id/cancel')
  cancel(@Param() params: IdParamDto, @Body() body: { reason?: string }) {
    return this.guestRequestService.cancel(params.id, body.reason);
  }

  @Delete(':id')
  remove(@Param() params: IdParamDto) {
    return this.guestRequestService.remove(params.id);
  }
}
