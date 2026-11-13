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
import { StaffService } from '../services/staff.service';
import { CreateStaffDto } from '../dto/create-staff.dto';
import { UpdateStaffDto } from '../dto/update-staff.dto';
import {
  AssignStaffManagerDto,
  StaffStatusReasonDto,
  TerminateStaffDto,
  TransferStaffDto,
  UpdateStaffScheduleDto,
} from '../dto/staff-actions.dto';
import { EmploymentStatus, StaffDepartment } from '../schemas/staff.entity';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { IdParamDto } from '../../common/dto/id-param.dto';

/**
 * Routes de gestion des affectations du personnel.
 *
 * Les routes spécifiques sont déclarées avant `:id`.
 */
@Controller('staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Post()
  create(@Body() createStaffDto: CreateStaffDto) {
    return this.staffService.create(createStaffDto);
  }

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.staffService.findAll(query);
  }

  @Get('property/:propertyId')
  findByProperty(
    @Param('propertyId') propertyId: string,
    @Query() query: PaginationQueryDto,
    @Query('department') department?: StaffDepartment,
    @Query('status') status?: EmploymentStatus,
  ) {
    return this.staffService.findByProperty(propertyId, query, {
      department,
      status,
    });
  }

  @Get('property/:propertyId/headcount')
  getHeadcount(@Param('propertyId') propertyId: string) {
    return this.staffService.getHeadcount(propertyId);
  }

  @Get('property/:propertyId/schedule/:day')
  findScheduledOn(
    @Param('propertyId') propertyId: string,
    @Param('day') day: string,
  ) {
    return this.staffService.findScheduledOn(propertyId, day);
  }

  @Get('organization/:organizationId')
  findByOrganization(
    @Param('organizationId') organizationId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.staffService.findByOrganization(organizationId, query);
  }

  @Get('user/:userId')
  findByUser(@Param('userId') userId: string) {
    return this.staffService.findByUser(userId);
  }

  @Get(':id')
  findOne(@Param() params: IdParamDto) {
    return this.staffService.findOne(params.id);
  }

  @Get(':id/reports')
  getDirectReports(@Param() params: IdParamDto) {
    return this.staffService.getDirectReports(params.id);
  }

  @Patch(':id')
  update(@Param() params: IdParamDto, @Body() updateStaffDto: UpdateStaffDto) {
    return this.staffService.update(params.id, updateStaffDto);
  }

  @Patch(':id/manager')
  assignManager(
    @Param() params: IdParamDto,
    @Body() body: AssignStaffManagerDto,
  ) {
    return this.staffService.assignManager(params.id, body.manager_id);
  }

  @Patch(':id/schedule')
  updateSchedule(
    @Param() params: IdParamDto,
    @Body() body: UpdateStaffScheduleDto,
  ) {
    return this.staffService.updateSchedule(params.id, body.schedule);
  }

  @Patch(':id/leave')
  putOnLeave(@Param() params: IdParamDto, @Body() body: StaffStatusReasonDto) {
    return this.staffService.putOnLeave(params.id, body.reason);
  }

  @Patch(':id/return')
  returnFromLeave(@Param() params: IdParamDto) {
    return this.staffService.returnFromLeave(params.id);
  }

  @Patch(':id/suspend')
  suspend(@Param() params: IdParamDto, @Body() body: StaffStatusReasonDto) {
    return this.staffService.suspend(params.id, body.reason);
  }

  @Patch(':id/reactivate')
  reactivate(@Param() params: IdParamDto) {
    return this.staffService.reactivate(params.id);
  }

  @Patch(':id/terminate')
  terminate(@Param() params: IdParamDto, @Body() body: TerminateStaffDto) {
    return this.staffService.terminate(params.id, body.reason, body.end_date);
  }

  @Patch(':id/transfer')
  transfer(@Param() params: IdParamDto, @Body() body: TransferStaffDto) {
    return this.staffService.transfer(params.id, body);
  }

  @Patch(':id/restore')
  restore(@Param() params: IdParamDto) {
    return this.staffService.restore(params.id);
  }

  @Delete(':id')
  remove(@Param() params: IdParamDto) {
    return this.staffService.remove(params.id);
  }
}
