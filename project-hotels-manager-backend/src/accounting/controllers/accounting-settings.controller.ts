import { Body, Controller, Get, Patch, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequiresApp } from '../../platform/apps/requires-app.decorator';
import { AccountingSettingsService } from '../services/accounting-settings.service';
import {
  AccountingSettingsQueryDto,
  UpdateAccountingSettingsDto,
} from '../dto/accounting-settings.dto';

@ApiTags('Comptabilité – paramètres')
@RequiresApp('accounting')
@Controller('accounting/settings')
export class AccountingSettingsController {
  constructor(private readonly settings: AccountingSettingsService) {}

  @Get()
  get(@Query() query: AccountingSettingsQueryDto) {
    return this.settings.get(query.property_id);
  }

  @Patch()
  update(@Body() dto: UpdateAccountingSettingsDto) {
    return this.settings.update(dto);
  }
}
