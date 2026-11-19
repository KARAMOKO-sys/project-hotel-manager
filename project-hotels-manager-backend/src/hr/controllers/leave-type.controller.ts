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
import { ApiTags } from '@nestjs/swagger';
import { IdParamDto } from '../../common/dto/id-param.dto';
import { RequiresApp } from '../../platform/apps/requires-app.decorator';
import { LeaveTypeService } from '../services/leave-type.service';
import { CreateLeaveTypeDto, UpdateLeaveTypeDto } from '../dto/leave.dto';
import { DepartmentQueryDto } from '../dto/department.dto';

@ApiTags('RH - Types de congé')
@RequiresApp('hr')
@Controller('hr/leave-types')
export class LeaveTypeController {
  constructor(private readonly service: LeaveTypeService) {}

  @Post()
  create(@Body() dto: CreateLeaveTypeDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll(@Query() query: DepartmentQueryDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  findOne(@Param() params: IdParamDto) {
    return this.service.findOne(params.id);
  }

  @Patch(':id')
  update(@Param() params: IdParamDto, @Body() dto: UpdateLeaveTypeDto) {
    return this.service.update(params.id, dto);
  }

  @Delete(':id')
  remove(@Param() params: IdParamDto) {
    return this.service.remove(params.id);
  }
}
