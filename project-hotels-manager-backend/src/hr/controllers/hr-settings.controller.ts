import { Body, Controller, Get, Put, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequiresApp } from '../../platform/apps/requires-app.decorator';
import { HrSettingsService } from '../services/hr-settings.service';
import { PropertyQueryDto, UpsertHrSettingsDto } from '../dto/hr-settings.dto';

/** Paramètres RH (semaine de travail, jours fériés). */
@ApiTags('RH - Paramètres')
@RequiresApp('hr')
@Controller('hr/settings')
export class HrSettingsController {
  constructor(private readonly service: HrSettingsService) {}

  @Get()
  get(@Query() query: PropertyQueryDto) {
    return this.service.get(query.property_id);
  }

  @Put()
  upsert(@Body() dto: UpsertHrSettingsDto) {
    return this.service.upsert(dto);
  }
}
