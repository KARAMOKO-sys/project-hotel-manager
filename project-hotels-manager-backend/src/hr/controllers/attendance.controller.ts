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
import { AttendanceService } from '../services/attendance.service';
import {
  AttendanceQueryDto,
  AttendanceReportQueryDto,
  CheckInDto,
  CheckOutDto,
  CreateAttendanceDto,
  UpdateAttendanceDto,
} from '../dto/attendance.dto';

@ApiTags('RH - Pointage')
@RequiresApp('hr')
@Controller('hr/attendance')
export class AttendanceController {
  constructor(private readonly service: AttendanceService) {}

  @Post('check-in')
  checkIn(@Body() dto: CheckInDto, @CurrentUser('sub') actorId?: string) {
    return this.service.checkIn(dto, actorId);
  }

  @Post('check-out')
  checkOut(@Body() dto: CheckOutDto) {
    return this.service.checkOut(dto);
  }

  /** Saisie manuelle d'un pointage complet. */
  @Post()
  create(@Body() dto: CreateAttendanceDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll(@Query() query: AttendanceQueryDto) {
    return this.service.findAll(query);
  }

  /** Heures pointées vs planifiées par employé. */
  @Get('report')
  report(@Query() query: AttendanceReportQueryDto) {
    return this.service.report(query);
  }

  @Get(':id')
  findOne(@Param() params: IdParamDto) {
    return this.service.findOne(params.id);
  }

  @Patch(':id')
  update(@Param() params: IdParamDto, @Body() dto: UpdateAttendanceDto) {
    return this.service.update(params.id, dto);
  }

  @Delete(':id')
  remove(@Param() params: IdParamDto) {
    return this.service.remove(params.id);
  }
}
