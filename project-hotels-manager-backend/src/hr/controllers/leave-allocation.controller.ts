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
import { LeaveAllocationService } from '../services/leave-allocation.service';
import {
  CreateLeaveAllocationDto,
  GenerateAllocationsDto,
  LeaveAllocationQueryDto,
  UpdateLeaveAllocationDto,
} from '../dto/leave.dto';

@ApiTags('RH - Allocations de congé')
@RequiresApp('hr')
@Controller('hr/leave-allocations')
export class LeaveAllocationController {
  constructor(private readonly service: LeaveAllocationService) {}

  @Post()
  create(@Body() dto: CreateLeaveAllocationDto) {
    return this.service.create(dto);
  }

  /** Génère les allocations annuelles du personnel (idempotent). */
  @Post('generate')
  generate(@Body() dto: GenerateAllocationsDto) {
    return this.service.generate(dto);
  }

  @Get()
  findAll(@Query() query: LeaveAllocationQueryDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  findOne(@Param() params: IdParamDto) {
    return this.service.findOne(params.id);
  }

  @Patch(':id')
  update(@Param() params: IdParamDto, @Body() dto: UpdateLeaveAllocationDto) {
    return this.service.update(params.id, dto);
  }

  @Delete(':id')
  remove(@Param() params: IdParamDto) {
    return this.service.remove(params.id);
  }
}
