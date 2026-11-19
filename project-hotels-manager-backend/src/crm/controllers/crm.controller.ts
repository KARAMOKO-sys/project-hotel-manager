import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequiresApp } from '../../platform/apps/requires-app.decorator';
import { CrmStageService } from '../services/crm-stage.service';
import { CrmSetupDto } from '../dto/crm-stage.dto';

@ApiTags('CRM')
@RequiresApp('crm')
@Controller('crm')
export class CrmController {
  constructor(private readonly stages: CrmStageService) {}

  /** Crée les étapes par défaut du pipeline (idempotent). */
  @Post('setup')
  setup(@Body() dto: CrmSetupDto) {
    return this.stages.setup(dto.property_id);
  }
}
