import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequiresApp } from '../../platform/apps/requires-app.decorator';
import { IdParamDto } from '../../common/dto/id-param.dto';
import { INTEGRATION_BUS_APP_KEY } from '../integration-bus.constants';
import { OrganizationScopeQueryDto } from '../dto/integration-endpoint.dto';
import { OutboxQueryDto } from '../dto/outbox-query.dto';
import { OutboxService } from '../services/outbox.service';
import { OutboxDispatcherService } from '../services/outbox-dispatcher.service';

/** Boîte d'envoi de l'ESB : consultation, relance, déclenchement manuel. */
@ApiTags('Integration Bus')
@RequiresApp(INTEGRATION_BUS_APP_KEY)
@Controller('integration/outbox')
export class IntegrationOutboxController {
  constructor(
    private readonly outbox: OutboxService,
    private readonly dispatcher: OutboxDispatcherService,
  ) {}

  /** Filtres : status, endpoint_id, event, event_id, organization_id, property_id. */
  @Get()
  findAll(@Query() query: OutboxQueryDto) {
    return this.outbox.findAll(query);
  }

  /** Traite immédiatement une passe de messages dus. */
  @Post('dispatch')
  dispatch(@Query() scope: OrganizationScopeQueryDto) {
    return this.dispatcher.dispatchDue({
      organizationId: scope.organization_id,
    });
  }

  /** Remet en file un message `dead` ou `failed`. */
  @Post(':id/retry')
  retry(
    @Param() params: IdParamDto,
    @Query() scope: OrganizationScopeQueryDto,
  ) {
    return this.outbox.retry(params.id, scope.organization_id);
  }
}
