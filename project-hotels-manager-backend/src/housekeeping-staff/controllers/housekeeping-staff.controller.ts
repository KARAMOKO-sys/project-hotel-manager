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
import { HousekeepingStaffService } from '../services/housekeeping-staff.service';
import { CreateHousekeepingStaffDto } from '../dto/create-housekeeping-staff.dto';
import { UpdateHousekeepingStaffDto } from '../dto/update-housekeeping-staff.dto';
import {
  AssignSupervisorDto,
  ChangeHousekeepingPasswordDto,
  MonthlyTargetDto,
  RecordCleaningDto,
  ReportIssueDto,
  SetHousekeepingStatusDto,
  SuspendHousekeepingStaffDto,
  UpdateHousekeepingScheduleDto,
} from '../dto/housekeeping-staff-actions.dto';
import {
  HousekeepingStatus,
  SpecializationType,
} from '../schemas/housekeeping-staff.entity';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { IdParamDto } from '../../common/dto/id-param.dto';

/**
 * Routes de gestion du personnel de ménage.
 *
 * Les routes spécifiques sont déclarées avant `:id`.
 */
@Controller('housekeeping-staff')
export class HousekeepingStaffController {
  constructor(
    private readonly housekeepingStaffService: HousekeepingStaffService,
  ) {}

  @Post()
  create(@Body() createHousekeepingStaffDto: CreateHousekeepingStaffDto) {
    return this.housekeepingStaffService.create(createHousekeepingStaffDto);
  }

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.housekeepingStaffService.findAll(query);
  }

  @Get('search')
  search(@Query('q') searchTerm: string) {
    return this.housekeepingStaffService.search(searchTerm);
  }

  @Get('email/:email')
  findByEmail(@Param('email') email: string) {
    return this.housekeepingStaffService.findByEmail(email);
  }

  @Get('employee/:code')
  findByEmployeeCode(@Param('code') code: string) {
    return this.housekeepingStaffService.findByEmployeeCode(code);
  }

  @Get('specialization/:specialization')
  findBySpecialization(
    @Param('specialization') specialization: SpecializationType,
    @Query() query: PaginationQueryDto,
  ) {
    return this.housekeepingStaffService.findBySpecialization(
      specialization,
      query,
    );
  }

  @Get('property/:propertyId')
  findByProperty(
    @Param('propertyId') propertyId: string,
    @Query() query: PaginationQueryDto,
    @Query('status') status?: HousekeepingStatus,
  ) {
    return this.housekeepingStaffService.findByProperty(
      propertyId,
      query,
      status,
    );
  }

  @Get('property/:propertyId/available')
  findAvailable(
    @Param('propertyId') propertyId: string,
    @Query('at') at?: string,
  ) {
    return this.housekeepingStaffService.findAvailable(
      propertyId,
      at ? new Date(at) : undefined,
    );
  }

  @Patch('property/:propertyId/reset-daily')
  resetDailyCounters(@Param('propertyId') propertyId: string) {
    return this.housekeepingStaffService.resetDailyCounters(propertyId);
  }

  @Patch('property/:propertyId/reset-monthly')
  resetMonthlyCounters(@Param('propertyId') propertyId: string) {
    return this.housekeepingStaffService.resetMonthlyCounters(propertyId);
  }

  @Get(':id')
  findOne(@Param() params: IdParamDto) {
    return this.housekeepingStaffService.findOne(params.id);
  }

  @Get(':id/workload')
  getWorkload(@Param() params: IdParamDto) {
    return this.housekeepingStaffService.getWorkload(params.id);
  }

  @Get(':id/performance')
  getPerformance(@Param() params: IdParamDto) {
    return this.housekeepingStaffService.getPerformance(params.id);
  }

  @Patch(':id')
  update(
    @Param() params: IdParamDto,
    @Body() updateHousekeepingStaffDto: UpdateHousekeepingStaffDto,
  ) {
    return this.housekeepingStaffService.update(
      params.id,
      updateHousekeepingStaffDto,
    );
  }

  @Patch(':id/activate')
  activate(@Param() params: IdParamDto) {
    return this.housekeepingStaffService.activate(params.id);
  }

  @Patch(':id/deactivate')
  deactivate(@Param() params: IdParamDto) {
    return this.housekeepingStaffService.deactivate(params.id);
  }

  @Patch(':id/suspend')
  suspend(
    @Param() params: IdParamDto,
    @Body() body: SuspendHousekeepingStaffDto,
  ) {
    return this.housekeepingStaffService.suspend(params.id, body.reason);
  }

  @Patch(':id/reactivate')
  reactivate(@Param() params: IdParamDto) {
    return this.housekeepingStaffService.reactivate(params.id);
  }

  @Patch(':id/status')
  setStatus(
    @Param() params: IdParamDto,
    @Body() body: SetHousekeepingStatusDto,
  ) {
    return this.housekeepingStaffService.setStatus(params.id, body.status);
  }

  @Patch(':id/password')
  changePassword(
    @Param() params: IdParamDto,
    @Body() body: ChangeHousekeepingPasswordDto,
  ) {
    return this.housekeepingStaffService.changePassword(
      params.id,
      body.current_password,
      body.new_password,
    );
  }

  @Patch(':id/schedule')
  updateSchedule(
    @Param() params: IdParamDto,
    @Body() body: UpdateHousekeepingScheduleDto,
  ) {
    return this.housekeepingStaffService.updateSchedule(params.id, body);
  }

  @Patch(':id/supervisor')
  assignSupervisor(
    @Param() params: IdParamDto,
    @Body() body: AssignSupervisorDto,
  ) {
    return this.housekeepingStaffService.assignSupervisor(
      params.id,
      body.supervisor_id,
      body.supervisor_name,
    );
  }

  @Patch(':id/monthly-target')
  setMonthlyTarget(
    @Param() params: IdParamDto,
    @Body() body: MonthlyTargetDto,
  ) {
    return this.housekeepingStaffService.setMonthlyTarget(
      params.id,
      body.monthly_target,
    );
  }

  @Post(':id/cleanings')
  recordCleaning(@Param() params: IdParamDto, @Body() body: RecordCleaningDto) {
    return this.housekeepingStaffService.recordCleaning(params.id, body);
  }

  @Post(':id/issues')
  reportIssue(@Param() params: IdParamDto, @Body() body: ReportIssueDto) {
    return this.housekeepingStaffService.reportIssue(params.id, body);
  }

  @Patch(':id/restore')
  restore(@Param() params: IdParamDto) {
    return this.housekeepingStaffService.restore(params.id);
  }

  @Delete(':id')
  remove(@Param() params: IdParamDto) {
    return this.housekeepingStaffService.remove(params.id);
  }
}
