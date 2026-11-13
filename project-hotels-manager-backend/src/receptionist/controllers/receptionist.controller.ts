import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseFloatPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ReceptionistService } from '../services/receptionist.service';
import { CreateReceptionistDto } from '../dto/create-receptionist.dto';
import { UpdateReceptionistDto } from '../dto/update-receptionist.dto';
import {
  ChangeReceptionistPasswordDto,
  RecordReceptionistActivityDto,
  SatisfactionScoreDto,
  SetReceptionistStatusDto,
  SuspendReceptionistDto,
  UpdateReceptionistScheduleDto,
} from '../dto/receptionist-actions.dto';
import { ReceptionistStatus } from '../schemas/receptionist.entity';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { IdParamDto } from '../../common/dto/id-param.dto';

/**
 * Routes de gestion des réceptionnistes.
 *
 * Les routes spécifiques sont déclarées avant `:id`.
 */
@Controller('receptionists')
export class ReceptionistController {
  constructor(private readonly receptionistService: ReceptionistService) {}

  @Post()
  create(@Body() createReceptionistDto: CreateReceptionistDto) {
    return this.receptionistService.create(createReceptionistDto);
  }

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.receptionistService.findAll(query);
  }

  @Get('search')
  search(@Query('q') searchTerm: string) {
    return this.receptionistService.search(searchTerm);
  }

  @Get('on-duty')
  findOnDuty(@Query('propertyId') propertyId?: string) {
    return this.receptionistService.findOnDuty(propertyId);
  }

  @Get('email/:email')
  findByEmail(@Param('email') email: string) {
    return this.receptionistService.findByEmail(email);
  }

  @Get('employee/:code')
  findByEmployeeCode(@Param('code') code: string) {
    return this.receptionistService.findByEmployeeCode(code);
  }

  @Get('property/:propertyId')
  findByProperty(
    @Param('propertyId') propertyId: string,
    @Query() query: PaginationQueryDto,
    @Query('status') status?: ReceptionistStatus,
  ) {
    return this.receptionistService.findByProperty(propertyId, query, status);
  }

  @Get('property/:propertyId/schedule/:day')
  findScheduledOn(
    @Param('propertyId') propertyId: string,
    @Param('day') day: string,
  ) {
    return this.receptionistService.findScheduledOn(propertyId, day);
  }

  @Get(':id')
  findOne(@Param() params: IdParamDto) {
    return this.receptionistService.findOne(params.id);
  }

  @Get(':id/schedule')
  getSchedule(@Param() params: IdParamDto) {
    return this.receptionistService.getSchedule(params.id);
  }

  @Get(':id/performance')
  getPerformance(@Param() params: IdParamDto) {
    return this.receptionistService.getPerformance(params.id);
  }

  @Get(':id/discount-check')
  checkDiscount(
    @Param() params: IdParamDto,
    @Query('percentage', ParseFloatPipe) percentage: number,
  ) {
    return this.receptionistService.checkDiscount(params.id, percentage);
  }

  @Patch(':id')
  update(
    @Param() params: IdParamDto,
    @Body() updateReceptionistDto: UpdateReceptionistDto,
  ) {
    return this.receptionistService.update(params.id, updateReceptionistDto);
  }

  @Patch(':id/activate')
  activate(@Param() params: IdParamDto) {
    return this.receptionistService.activate(params.id);
  }

  @Patch(':id/deactivate')
  deactivate(@Param() params: IdParamDto) {
    return this.receptionistService.deactivate(params.id);
  }

  @Patch(':id/suspend')
  suspend(@Param() params: IdParamDto, @Body() body: SuspendReceptionistDto) {
    return this.receptionistService.suspend(params.id, body.reason);
  }

  @Patch(':id/reactivate')
  reactivate(@Param() params: IdParamDto) {
    return this.receptionistService.reactivate(params.id);
  }

  @Patch(':id/status')
  setStatus(
    @Param() params: IdParamDto,
    @Body() body: SetReceptionistStatusDto,
  ) {
    return this.receptionistService.setStatus(params.id, body.status);
  }

  @Patch(':id/password')
  changePassword(
    @Param() params: IdParamDto,
    @Body() body: ChangeReceptionistPasswordDto,
  ) {
    return this.receptionistService.changePassword(
      params.id,
      body.current_password,
      body.new_password,
    );
  }

  @Patch(':id/shift/start')
  startShift(@Param() params: IdParamDto) {
    return this.receptionistService.startShift(params.id);
  }

  @Patch(':id/shift/end')
  endShift(@Param() params: IdParamDto) {
    return this.receptionistService.endShift(params.id);
  }

  @Patch(':id/schedule')
  updateSchedule(
    @Param() params: IdParamDto,
    @Body() body: UpdateReceptionistScheduleDto,
  ) {
    return this.receptionistService.updateSchedule(
      params.id,
      body.shift_schedule,
      body.shift_type,
    );
  }

  @Post(':id/activities')
  recordActivity(
    @Param() params: IdParamDto,
    @Body() body: RecordReceptionistActivityDto,
  ) {
    return this.receptionistService.recordActivity(
      params.id,
      body.type,
      body.handling_time,
    );
  }

  @Post(':id/satisfaction')
  updateSatisfactionScore(
    @Param() params: IdParamDto,
    @Body() body: SatisfactionScoreDto,
  ) {
    return this.receptionistService.updateSatisfactionScore(
      params.id,
      body.score,
    );
  }

  @Patch(':id/restore')
  restore(@Param() params: IdParamDto) {
    return this.receptionistService.restore(params.id);
  }

  @Delete(':id')
  remove(@Param() params: IdParamDto) {
    return this.receptionistService.remove(params.id);
  }
}
