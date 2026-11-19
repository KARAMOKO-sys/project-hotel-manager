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
import { RequiresApp } from '../../platform/apps/requires-app.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { IdParamDto } from '../../common/dto/id-param.dto';
import { AutomationRuleService } from '../services/automation-rule.service';
import { AutomationEngineService } from '../services/automation-engine.service';
import {
  AutomationRuleQueryDto,
  CreateAutomationRuleDto,
  TestAutomationRuleDto,
  UpdateAutomationRuleDto,
} from '../dto/automation-rule.dto';

/** Règles d'automatisation « quand… si… alors… ». */
@ApiTags('Automation')
@RequiresApp('automation')
@Controller('automation/rules')
export class AutomationRulesController {
  constructor(
    private readonly rules: AutomationRuleService,
    private readonly engine: AutomationEngineService,
  ) {}

  @Post()
  create(
    @Body() dto: CreateAutomationRuleDto,
    @CurrentUser('sub') userId: string | undefined,
  ) {
    return this.rules.create(dto, userId);
  }

  @Get()
  findAll(@Query() query: AutomationRuleQueryDto) {
    return this.rules.findAll(query);
  }

  @Get(':id')
  findOne(@Param() params: IdParamDto) {
    return this.rules.findOne(params.id);
  }

  @Patch(':id')
  update(@Param() params: IdParamDto, @Body() dto: UpdateAutomationRuleDto) {
    return this.rules.update(params.id, dto);
  }

  @Delete(':id')
  remove(@Param() params: IdParamDto) {
    return this.rules.remove(params.id);
  }

  @Post(':id/toggle')
  toggle(@Param() params: IdParamDto) {
    return this.rules.toggle(params.id);
  }

  /** Essai à blanc : n'exécute aucune action. */
  @Post(':id/test')
  async test(@Param() params: IdParamDto, @Body() dto: TestAutomationRuleDto) {
    const rule = await this.rules.findOne(params.id);
    return this.engine.dryRun(rule, dto.event ?? {});
  }
}
