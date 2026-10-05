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
import { GuestSegmentService } from '../services/guest-segment.service';
import { CreateGuestSegmentDto } from '../dto/create-guest-segment.dto';
import { UpdateGuestSegmentDto } from '../dto/update-guest-segment.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { IdParamDto } from '../../common/dto/id-param.dto';

@Controller('guest-segments')
export class GuestSegmentController {
  constructor(private readonly guestSegmentService: GuestSegmentService) {}

  @Post()
  create(@Body() createGuestSegmentDto: CreateGuestSegmentDto) {
    return this.guestSegmentService.create(createGuestSegmentDto);
  }

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.guestSegmentService.findAll(query);
  }

  @Get('property/:propertyId')
  findByProperty(
    @Param('propertyId') propertyId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.guestSegmentService.findByProperty(propertyId, query);
  }

  @Get(':id')
  findOne(@Param() params: IdParamDto) {
    return this.guestSegmentService.findOne(params.id);
  }

  @Patch(':id')
  update(
    @Param() params: IdParamDto,
    @Body() updateGuestSegmentDto: UpdateGuestSegmentDto,
  ) {
    return this.guestSegmentService.update(params.id, updateGuestSegmentDto);
  }

  @Patch(':id/activate')
  activate(@Param() params: IdParamDto) {
    return this.guestSegmentService.activate(params.id);
  }

  @Patch(':id/deactivate')
  deactivate(@Param() params: IdParamDto) {
    return this.guestSegmentService.deactivate(params.id);
  }

  @Get(':id/statistics')
  getStatistics(@Param() params: IdParamDto) {
    return this.guestSegmentService.getStatistics(params.id);
  }

  @Delete(':id')
  remove(@Param() params: IdParamDto) {
    return this.guestSegmentService.remove(params.id);
  }
}
