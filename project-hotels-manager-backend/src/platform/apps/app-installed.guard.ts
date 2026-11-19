import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { REQUIRES_APP_KEY } from './requires-app.decorator';
import { AppsService } from './apps.service';
import { APP_BY_KEY } from './app-catalog';
import { TenantScopeService } from '../tenancy/tenant-scope.service';

/**
 * Refuse l'accès aux routes d'une application non installée pour
 * l'organisation visée par la requête (HTTP 403).
 */
@Injectable()
export class AppInstalledGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly apps: AppsService,
    private readonly tenantScope: TenantScopeService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return true;
    const appKey = this.reflector.getAllAndOverride<string>(REQUIRES_APP_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!appKey) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const organizationId = await this.tenantScope.resolveFromRequest(
      request as never,
    );
    if (!organizationId) return true;

    if (!(await this.apps.isInstalled(organizationId, appKey))) {
      const name = APP_BY_KEY.get(appKey)?.name ?? appKey;
      throw new ForbiddenException(
        `L'application « ${name} » n'est pas installée pour cette organisation`,
      );
    }
    return true;
  }
}
