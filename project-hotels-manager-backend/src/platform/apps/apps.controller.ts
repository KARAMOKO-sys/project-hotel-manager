import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsMongoId } from 'class-validator';
import { AppsService } from './apps.service';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { DOMAIN_EVENT_NAMES } from '../events/domain-events';

class OrganizationQueryDto {
  @IsMongoId()
  organization_id!: string;
}

/** Magasin d'applications : catalogue, installation, désinstallation. */
@ApiTags('Applications')
@Controller('apps')
export class AppsController {
  constructor(private readonly apps: AppsService) {}

  @Get()
  @Permissions('apps:read')
  list(@Query() query: OrganizationQueryDto) {
    return this.apps.list(query.organization_id);
  }

  @Get('installed')
  @Permissions('apps:read')
  async installed(@Query() query: OrganizationQueryDto) {
    return [...(await this.apps.getInstalledKeys(query.organization_id))];
  }

  /** Liste des événements métier (pour les automatisations et l'ESB). */
  @Get('events')
  @Permissions('apps:read')
  events() {
    return DOMAIN_EVENT_NAMES;
  }

  @Post(':key/install')
  @Permissions('apps:install')
  install(
    @Param('key') key: string,
    @Query() query: OrganizationQueryDto,
    @CurrentUser('sub') actorId: string,
  ) {
    return this.apps.install(query.organization_id, key, actorId);
  }

  @Post(':key/uninstall')
  @Permissions('apps:install')
  uninstall(
    @Param('key') key: string,
    @Query() query: OrganizationQueryDto,
    @CurrentUser('sub') actorId: string,
  ) {
    return this.apps.uninstall(query.organization_id, key, actorId);
  }
}
