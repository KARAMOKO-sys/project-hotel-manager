import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequiresApp } from '../../platform/apps/requires-app.decorator';
import { AccountingSettingsService } from '../services/accounting-settings.service';
import { SetupAccountingDto } from '../dto/accounting-settings.dto';

/** Initialisation de la comptabilité d'un établissement. */
@ApiTags('Comptabilité')
@RequiresApp('accounting')
@Controller('accounting')
export class AccountingSetupController {
  constructor(private readonly settings: AccountingSettingsService) {}

  /** Crée (idempotent) le plan comptable SYSCOHADA, les journaux et les paramètres. */
  @Post('setup')
  setup(@Body() dto: SetupAccountingDto) {
    return this.settings.setup(dto.property_id);
  }
}
