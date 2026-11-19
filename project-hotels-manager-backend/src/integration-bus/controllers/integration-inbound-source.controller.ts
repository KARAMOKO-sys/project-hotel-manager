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
  OrganizationScopeQueryDto,
  RotateSecretDto,
} from '../dto/integration-endpoint.dto';
import {
  CreateInboundSourceDto,
  InboundSourceQueryDto,
  UpdateInboundSourceDto,
} from '../dto/inbound-source.dto';
import { InboundSourceService } from '../services/inbound-source.service';

/** Sources de webhooks entrants (secret en écriture seule). */
@ApiTags('Integration Bus')
@RequiresApp(INTEGRATION_BUS_APP_KEY)
@Controller('integration/inbound-sources')
export class IntegrationInboundSourceController {
  constructor(private readonly sources: InboundSourceService) {}

  /** Renvoie `inbound_path` et, s'il a été généré, `secret` (une seule fois). */
  @Post()
  create(
    @Body() dto: CreateInboundSourceDto,
    @CurrentUser('sub') actorId: string,
  ) {
    return this.sources.create(dto, actorId);
  }

  @Get()
  findAll(@Query() query: InboundSourceQueryDto) {
    return this.sources.findAll(query);
  }

  @Get(':id')
  findOne(
    @Param() params: IdParamDto,
    @Query() scope: OrganizationScopeQueryDto,
  ) {
    return this.sources.findOne(params.id, scope.organization_id);
  }

  @Patch(':id')
  update(
    @Param() params: IdParamDto,
    @Body() dto: UpdateInboundSourceDto,
    @Query() scope: OrganizationScopeQueryDto,
  ) {
    return this.sources.update(params.id, dto, scope.organization_id);
  }

  @Delete(':id')
  remove(
    @Param() params: IdParamDto,
    @Query() scope: OrganizationScopeQueryDto,
  ) {
    return this.sources.remove(params.id, scope.organization_id);
  }

  @Post(':id/rotate-secret')
  rotateSecret(
    @Param() params: IdParamDto,
    @Body() dto: RotateSecretDto,
    @Query() scope: OrganizationScopeQueryDto,
  ) {
    return this.sources.rotateSecret(params.id, dto, scope.organization_id);
  }
}
