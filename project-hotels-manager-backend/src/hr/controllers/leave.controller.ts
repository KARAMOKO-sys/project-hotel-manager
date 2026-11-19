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
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { RequiresApp } from '../../platform/apps/requires-app.decorator';
import { LeaveRequestService } from '../services/leave-request.service';
import {
  CreateLeaveRequestDto,
  LeaveBalanceQueryDto,
  LeaveRequestQueryDto,
  RefuseLeaveDto,
  UpdateLeaveRequestDto,
} from '../dto/leave.dto';

@ApiTags('RH - Congés')
@RequiresApp('hr')
@Controller('hr/leaves')
export class LeaveController {
  constructor(private readonly service: LeaveRequestService) {}

  @Post()
  create(
    @Body() dto: CreateLeaveRequestDto,
    @CurrentUser('sub') actorId?: string,
  ) {
    return this.service.create(dto, actorId);
  }

  @Get()
  findAll(@Query() query: LeaveRequestQueryDto) {
    return this.service.findAll(query);
  }

  /** Soldes par type de congé pour un employé et une année. */
  @Get('balance')
  balance(@Query() query: LeaveBalanceQueryDto) {
    return this.service.getBalances(query.staff_id, query.year);
  }

  @Get(':id')
  findOne(@Param() params: IdParamDto) {
    return this.service.findOne(params.id);
  }

  @Patch(':id')
  update(@Param() params: IdParamDto, @Body() dto: UpdateLeaveRequestDto) {
    return this.service.update(params.id, dto);
  }

  @Post(':id/submit')
  submit(@Param() params: IdParamDto, @CurrentUser('sub') actorId?: string) {
    return this.service.submit(params.id, actorId);
  }

  @Post(':id/approve')
  approve(@Param() params: IdParamDto, @CurrentUser('sub') actorId?: string) {
    return this.service.approve(params.id, actorId);
  }

  @Post(':id/refuse')
  refuse(
    @Param() params: IdParamDto,
    @Body() dto: RefuseLeaveDto,
    @CurrentUser('sub') actorId?: string,
  ) {
    return this.service.refuse(params.id, dto, actorId);
  }

  @Post(':id/cancel')
  cancel(@Param() params: IdParamDto) {
    return this.service.cancel(params.id);
  }

  @Delete(':id')
  remove(@Param() params: IdParamDto) {
    return this.service.remove(params.id);
  }
}
