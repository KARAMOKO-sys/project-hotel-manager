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
import { BlockedDateService } from '../services/blocked-date.service';
import { CreateBlockedDateDto } from '../dto/create-blocked-date.dto';
import { UpdateBlockedDateDto } from '../dto/update-blocked-date.dto';
import { BlockedDateRangeQueryDto } from '../dto/blocked-date-query.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { IdParamDto } from '../../common/dto/id-param.dto';

@Controller('blocked-dates')
export class BlockedDateController {
  constructor(private readonly blockedDateService: BlockedDateService) {}

  @Post()
  create(@Body() createBlockedDateDto: CreateBlockedDateDto) {
    return this.blockedDateService.create(createBlockedDateDto);
  }

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.blockedDateService.findAll(query);
  }

  @Get('property/:propertyId')
  findByProperty(
    @Param('propertyId') propertyId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.blockedDateService.findByProperty(propertyId, query);
  }

  @Get('property/:propertyId/range')
  getBlockedDates(
    @Param('propertyId') propertyId: string,
    @Query() range: BlockedDateRangeQueryDto,
  ) {
    return this.blockedDateService.getBlockedDates(
      propertyId,
      range.start_date,
      range.end_date,
      { roomId: range.room_id, roomTypeId: range.room_type_id },
    );
  }

  @Get('property/:propertyId/check')
  async isBlocked(
    @Param('propertyId') propertyId: string,
    @Query() range: BlockedDateRangeQueryDto,
  ) {
    const blocked = await this.blockedDateService.isBlocked(
      propertyId,
      range.start_date,
      range.end_date,
      { roomId: range.room_id, roomTypeId: range.room_type_id },
    );
    return { blocked };
  }

  @Get('room/:roomId')
  findByRoom(
    @Param('roomId') roomId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.blockedDateService.findByRoom(roomId, query);
  }

  @Get(':id')
  findOne(@Param() params: IdParamDto) {
    return this.blockedDateService.findOne(params.id);
  }

  @Patch(':id')
  update(
    @Param() params: IdParamDto,
    @Body() updateBlockedDateDto: UpdateBlockedDateDto,
  ) {
    return this.blockedDateService.update(params.id, updateBlockedDateDto);
  }

  @Patch(':id/unblock')
  unblock(@Param() params: IdParamDto) {
    return this.blockedDateService.unblock(params.id);
  }

  @Delete(':id')
  remove(@Param() params: IdParamDto) {
    return this.blockedDateService.remove(params.id);
  }
}
