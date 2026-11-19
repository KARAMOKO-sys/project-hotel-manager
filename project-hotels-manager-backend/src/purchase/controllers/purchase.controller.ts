import { Body, Controller, Get, Patch, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequiresApp } from '../../platform/apps/requires-app.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { PurchaseReportService } from '../services/purchase-report.service';
import { PurchaseSettingsService } from '../services/purchase-settings.service';
import {
  BillsDueQueryDto,
  PurchasePeriodQueryDto,
  PurchasePropertyQueryDto,
  UpdatePurchaseSettingsDto,
} from '../dto/purchase-settings.dto';

/** Paramètres, suggestions de réapprovisionnement et rapports d'achats. */
@ApiTags('Achats')
@RequiresApp('purchase')
@Controller('purchase')
export class PurchaseController {
  constructor(
    private readonly reports: PurchaseReportService,
    private readonly settings: PurchaseSettingsService,
  ) {}

  @Get('reorder-suggestions')
  reorderSuggestions(@Query() query: PurchasePropertyQueryDto) {
    return this.reports.reorderSuggestions(query.property_id);
  }

  @Get('settings')
  @Permissions('purchase-settings:read')
  getSettings(@Query() query: PurchasePropertyQueryDto) {
    return this.settings.get(query.property_id);
  }

  @Patch('settings')
  @Permissions('purchase-settings:update')
  updateSettings(
    @Body() dto: UpdatePurchaseSettingsDto,
    @CurrentUser('sub') actorId: string,
  ) {
    return this.settings.update(dto, actorId);
  }

  @Get('reports/by-vendor')
  byVendor(@Query() query: PurchasePeriodQueryDto) {
    return this.reports.purchasesByVendor(
      query.property_id,
      query.from ? new Date(query.from) : undefined,
      query.to ? new Date(query.to) : undefined,
    );
  }

  @Get('reports/open-orders')
  openOrders(@Query() query: PurchasePropertyQueryDto) {
    return this.reports.openOrders(query.property_id);
  }

  @Get('reports/bills-due')
  billsDue(@Query() query: BillsDueQueryDto) {
    return this.reports.billsDue(
      query.property_id,
      query.until ? new Date(query.until) : undefined,
    );
  }
}
