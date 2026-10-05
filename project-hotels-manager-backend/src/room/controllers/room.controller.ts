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
import { RoomService } from '../services/room.service';
import { CreateRoomDto } from '../dto/create-room.dto';
import { UpdateRoomDto } from '../dto/update-room.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { IdParamDto } from '../../common/dto/id-param.dto';
import { RoomStatus } from '../../base-entities/enums/room-status.enum';

@Controller('rooms')
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  @Post()
  create(@Body() createRoomDto: CreateRoomDto) {
    return this.roomService.create(createRoomDto);
  }

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.roomService.findAll(query);
  }

  @Get('property/:propertyId')
  findByProperty(
    @Param('propertyId') propertyId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.roomService.findByProperty(propertyId, query);
  }

  @Get('property/:propertyId/available')
  getAvailableRooms(@Param('propertyId') propertyId: string) {
    return this.roomService.getAvailableRooms(propertyId);
  }

  @Get('property/:propertyId/maintenance')
  getMaintenanceRooms(@Param('propertyId') propertyId: string) {
    return this.roomService.getMaintenanceRooms(propertyId);
  }

  @Get(':id')
  findOne(@Param() params: IdParamDto) {
    return this.roomService.findOne(params.id);
  }

  @Patch(':id')
  update(@Param() params: IdParamDto, @Body() updateRoomDto: UpdateRoomDto) {
    return this.roomService.update(params.id, updateRoomDto);
  }

  @Patch(':id/status')
  updateStatus(
    @Param() params: IdParamDto,
    @Body() body: { status: RoomStatus },
  ) {
    return this.roomService.updateStatus(params.id, body.status);
  }

  @Patch(':id/block')
  blockRoom(@Param() params: IdParamDto, @Body() body: { reason?: string }) {
    return this.roomService.blockRoom(params.id, body.reason);
  }

  @Delete(':id')
  remove(@Param() params: IdParamDto) {
    return this.roomService.remove(params.id);
  }
}
