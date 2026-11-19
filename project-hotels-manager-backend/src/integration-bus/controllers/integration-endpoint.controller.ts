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
import { INTEGRATION_BUS_APP_KEY } from '../integration-bus.constants';
import {
  CreateIntegrationEndpointDto,
  IntegrationEndpointQueryDto,
  OrganizationScopeQueryDto,
  RotateSecretDto,
  UpdateIntegrationEndpointDto,
} from '../dto/integration-endpoint.dto';
import { IntegrationEndpointService } from '../services/integration-endpoint.service';

/** Points de terminaison sortants de l'ESB (secret en écriture seule). */
@ApiTags('Integration Bus')
@RequiresApp(INTEGRATION_BUS_APP_KEY)
@Controller('integration/endpoints')
export class IntegrationEndpointController {
  constructor(private readonly endpoints: IntegrationEndpointService) {}

  /** Crée un point de terminaison ; renvoie `secret` une seule fois s'il a été généré. */
  @Post()
  create(
    @Body() dto: CreateIntegrationEndpointDto,
    @CurrentUser('sub') actorId: string,
  ) {
    return this.endpoints.create(dto, actorId);
  }

  @Get()
  findAll(@Query() query: IntegrationEndpointQueryDto) {
    return this.endpoints.findAll(query);
  }

  @Get(':id')
  findOne(
    @Param() params: IdParamDto,
    @Query() scope: OrganizationScopeQueryDto,
  ) {
    return this.endpoints.findOne(params.id, scope.organization_id);
  }

  @Patch(':id')
  update(
    @Param() params: IdParamDto,
    @Body() dto: UpdateIntegrationEndpointDto,
    @Query() scope: OrganizationScopeQueryDto,
  ) {
    return this.endpoints.update(params.id, dto, scope.organization_id);
  }

  @Delete(':id')
  remove(
    @Param() params: IdParamDto,
    @Query() scope: OrganizationScopeQueryDto,
  ) {
    return this.endpoints.remove(params.id, scope.organization_id);
  }

  /** Nouveau secret de signature, renvoyé UNE seule fois. */
  @Post(':id/rotate-secret')
  rotateSecret(
    @Param() params: IdParamDto,
    @Body() dto: RotateSecretDto,
    @Query() scope: OrganizationScopeQueryDto,
  ) {
    return this.endpoints.rotateSecret(
      params.id,
      dto.secret,
      scope.organization_id,
    );
  }

  /** Envoie un événement `platform.ping` signé et renvoie statut et latence. */
  @Post(':id/test')
  test(@Param() params: IdParamDto, @Query() scope: OrganizationScopeQueryDto) {
    return this.endpoints.test(params.id, scope.organization_id);
  }
}
