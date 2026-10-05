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
import { RoomTypeService } from '../services/room-type.service';
import { CreateRoomTypeDto } from '../dto/create-room-type.dto';
import { UpdateRoomTypeDto } from '../dto/update-room-type.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { IdParamDto } from '../../common/dto/id-param.dto';

@Controller('room-types')
export class RoomTypeController {
  constructor(private readonly roomTypeService: RoomTypeService) {}

  @Post()
  create(@Body() createRoomTypeDto: CreateRoomTypeDto) {
    return this.roomTypeService.create(createRoomTypeDto);
  }

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.roomTypeService.findAll(query);
  }

  @Get('property/:propertyId')
  findByProperty(
    @Param('propertyId') propertyId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.roomTypeService.findByProperty(propertyId, query);
  }

  @Get(':id')
  findOne(@Param() params: IdParamDto) {
    return this.roomTypeService.findOne(params.id);
  }

  @Patch(':id')
  update(
    @Param() params: IdParamDto,
    @Body() updateRoomTypeDto: UpdateRoomTypeDto,
  ) {
    return this.roomTypeService.update(params.id, updateRoomTypeDto);
  }

  @Delete(':id')
  remove(@Param() params: IdParamDto) {
    return this.roomTypeService.remove(params.id);
  }

  @Patch(':id/base-price')
  updateBasePrice(
    @Param() params: IdParamDto,
    @Body() body: { amount: number; currency?: string },
  ) {
    return this.roomTypeService.updateBasePrice(
      params.id,
      body.amount,
      body.currency,
    );
  }

  @Get(':id/rooms')
  getRooms(@Param() params: IdParamDto) {
    return this.roomTypeService.getRooms(params.id);
  }
}
