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
import { ShiftService } from '../services/shift.service';
import {
  CopyWeekDto,
  CreateShiftDto,
  ShiftQueryDto,
  ShiftWeekQueryDto,
  UpdateShiftDto,
} from '../dto/shift.dto';

@ApiTags('RH - Planning')
@RequiresApp('hr')
@Controller('hr/shifts')
export class ShiftController {
  constructor(private readonly service: ShiftService) {}

  @Post()
  create(@Body() dto: CreateShiftDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll(@Query() query: ShiftQueryDto) {
    return this.service.findAll(query);
  }

  /** Grille hebdomadaire (7 jours à partir de `start`). */
  @Get('week')
  week(@Query() query: ShiftWeekQueryDto) {
    return this.service.getWeek(query);
  }

  /** Copie une semaine de planning vers une autre. */
  @Post('copy-week')
  copyWeek(@Body() dto: CopyWeekDto) {
    return this.service.copyWeek(dto);
  }

  @Get(':id')
  findOne(@Param() params: IdParamDto) {
    return this.service.findOne(params.id);
  }

  @Patch(':id')
  update(@Param() params: IdParamDto, @Body() dto: UpdateShiftDto) {
    return this.service.update(params.id, dto);
  }

  @Post(':id/confirm')
  confirm(@Param() params: IdParamDto) {
    return this.service.confirm(params.id);
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
