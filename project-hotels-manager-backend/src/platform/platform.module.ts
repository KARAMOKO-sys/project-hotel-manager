import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DomainEventPublisher } from './events/domain-event.publisher';
import { AppsService } from './apps/apps.service';
import { AppsController } from './apps/apps.controller';
import { AppInstalledGuard } from './apps/app-installed.guard';
import {
  OrganizationApp,
  OrganizationAppSchema,
} from './apps/organization-app.entity';
import { TenantScopeService } from './tenancy/tenant-scope.service';
import {
  Sequence,
  SequenceSchema,
  SequenceService,
} from './sequences/sequence.service';

/**
 * Socle ERP partagé par toutes les applications : événements métier,
 * magasin d'applications, portée d'organisation et numérotation.
 *
 * Global : tout module peut injecter `DomainEventPublisher`, `AppsService`,
 * `TenantScopeService` et `SequenceService` sans import explicite.
 * Nécessite `EventEmitterModule.forRoot()` dans `AppModule`.
 */
@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: OrganizationApp.name, schema: OrganizationAppSchema },
      { name: Sequence.name, schema: SequenceSchema },
    ]),
  ],
  controllers: [AppsController],
  providers: [
    DomainEventPublisher,
    AppsService,
    AppInstalledGuard,
    TenantScopeService,
    SequenceService,
  ],
  exports: [
    DomainEventPublisher,
    AppsService,
    AppInstalledGuard,
    TenantScopeService,
    SequenceService,
  ],
})
export class PlatformModule {}
