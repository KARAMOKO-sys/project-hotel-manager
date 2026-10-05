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
import { MaintenanceRequestService } from '../services/maintenance-request.service';
import { CreateMaintenanceRequestDto } from '../dto/create-maintenance-request.dto';
import { UpdateMaintenanceRequestDto } from '../dto/update-maintenance-request.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { IdParamDto } from '../../common/dto/id-param.dto';

@Controller('maintenance-requests')
export class MaintenanceRequestController {
  constructor(
    private readonly maintenanceRequestService: MaintenanceRequestService,
  ) {}

  @Post()
  create(@Body() createMaintenanceRequestDto: CreateMaintenanceRequestDto) {
    return this.maintenanceRequestService.create(createMaintenanceRequestDto);
  }

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.maintenanceRequestService.findAll(query);
  }

  @Get('property/:propertyId')
  getRequestsByProperty(@Param('propertyId') propertyId: string) {
    return this.maintenanceRequestService.getRequestsByProperty(propertyId);
  }

  @Get('property/:propertyId/urgent')
  getUrgentRequests(@Param('propertyId') propertyId: string) {
    return this.maintenanceRequestService.getUrgentRequests(propertyId);
  }

  @Get(':id')
  findOne(@Param() params: IdParamDto) {
    return this.maintenanceRequestService.findOne(params.id);
  }

  @Patch(':id')
  update(
    @Param() params: IdParamDto,
    @Body() updateMaintenanceRequestDto: UpdateMaintenanceRequestDto,
  ) {
    return this.maintenanceRequestService.update(
      params.id,
      updateMaintenanceRequestDto,
    );
  }

  @Patch(':id/assign')
  assignRequest(
    @Param() params: IdParamDto,
    @Body() body: { staff_id: string },
  ) {
    return this.maintenanceRequestService.assignRequest(
      params.id,
      body.staff_id,
    );
  }

  @Patch(':id/start')
  startRequest(@Param() params: IdParamDto) {
    return this.maintenanceRequestService.startRequest(params.id);
  }

  @Patch(':id/complete')
  completeRequest(
    @Param() params: IdParamDto,
    @Body() body: { resolution?: string },
  ) {
    return this.maintenanceRequestService.completeRequest(
      params.id,
      body.resolution,
    );
  }

  @Patch(':id/cancel')
  cancelRequest(
    @Param() params: IdParamDto,
    @Body() body: { reason?: string },
  ) {
    return this.maintenanceRequestService.cancelRequest(params.id, body.reason);
  }

  @Delete(':id')
  remove(@Param() params: IdParamDto) {
    return this.maintenanceRequestService.remove(params.id);
  }
}
