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
import { HousekeepingService } from '../services/housekeeping.service';
import { CreateHousekeepingDto } from '../dto/create-housekeeping.dto';
import { UpdateHousekeepingDto } from '../dto/update-housekeeping.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { IdParamDto } from '../../common/dto/id-param.dto';

@Controller('housekeeping')
export class HousekeepingController {
  constructor(private readonly housekeepingService: HousekeepingService) {}

  @Post()
  create(@Body() createHousekeepingDto: CreateHousekeepingDto) {
    return this.housekeepingService.create(createHousekeepingDto);
  }

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.housekeepingService.findAll(query);
  }

  @Get('property/:propertyId/pending')
  getPendingTasks(@Param('propertyId') propertyId: string) {
    return this.housekeepingService.getPendingTasks(propertyId);
  }

  @Get('staff/:staffId')
  getTasksByStaff(
    @Param('staffId') staffId: string,
    @Query('date') date?: string,
  ) {
    return this.housekeepingService.getTasksByStaff(
      staffId,
      date ? new Date(date) : undefined,
    );
  }

  @Get('room/:roomId')
  getTasksByRoom(@Param('roomId') roomId: string) {
    return this.housekeepingService.getTasksByRoom(roomId);
  }

  @Get(':id')
  findOne(@Param() params: IdParamDto) {
    return this.housekeepingService.findOne(params.id);
  }

  @Patch(':id')
  update(
    @Param() params: IdParamDto,
    @Body() updateHousekeepingDto: UpdateHousekeepingDto,
  ) {
    return this.housekeepingService.update(params.id, updateHousekeepingDto);
  }

  @Patch(':id/assign')
  assignTask(@Param() params: IdParamDto, @Body() body: { staff_id: string }) {
    return this.housekeepingService.assignTask(params.id, body.staff_id);
  }

  @Patch(':id/start')
  startTask(@Param() params: IdParamDto) {
    return this.housekeepingService.startTask(params.id);
  }

  @Patch(':id/complete')
  completeTask(
    @Param() params: IdParamDto,
    @Body() body: { photos?: string[] },
  ) {
    return this.housekeepingService.completeTask(params.id, body.photos);
  }

  @Patch(':id/skip')
  skipTask(@Param() params: IdParamDto, @Body() body: { reason?: string }) {
    return this.housekeepingService.skipTask(params.id, body.reason);
  }

  @Delete(':id')
  remove(@Param() params: IdParamDto) {
    return this.housekeepingService.remove(params.id);
  }
}
