import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequiresApp } from '../../platform/apps/requires-app.decorator';
import { INTEGRATION_BUS_APP_KEY } from '../integration-bus.constants';
import { OrganizationScopeQueryDto } from '../dto/integration-endpoint.dto';
import { OutboxService } from '../services/outbox.service';

/** Statistiques de l'ESB : messages par statut, taux de succès sur 24 h. */
@ApiTags('Integration Bus')
@RequiresApp(INTEGRATION_BUS_APP_KEY)
@Controller('integration/stats')
export class IntegrationStatsController {
  constructor(private readonly outbox: OutboxService) {}

  @Get()
  stats(@Query() scope: OrganizationScopeQueryDto) {
    return this.outbox.getStats(scope.organization_id);
  }
}
