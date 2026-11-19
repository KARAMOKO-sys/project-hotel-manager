import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequiresApp } from '../../platform/apps/requires-app.decorator';
import { IdParamDto } from '../../common/dto/id-param.dto';
import { AutomationRunService } from '../services/automation-run.service';
import { AutomationRunQueryDto } from '../dto/automation-rule.dto';

/** Journal d'exécution des règles. */
@ApiTags('Automation')
@RequiresApp('automation')
@Controller('automation/runs')
export class AutomationRunsController {
  constructor(private readonly runs: AutomationRunService) {}

  @Get()
  findAll(@Query() query: AutomationRunQueryDto) {
    return this.runs.findAll(query);
  }

  @Get(':id')
  findOne(@Param() params: IdParamDto) {
    return this.runs.findOne(params.id);
  }
}
