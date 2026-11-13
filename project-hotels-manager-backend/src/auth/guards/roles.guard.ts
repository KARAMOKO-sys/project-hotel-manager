import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Types } from 'mongoose';
import {
  IS_PUBLIC_KEY,
  PERMISSIONS_KEY,
  ROLES_KEY,
  SUPER_ADMIN_ROLE,
} from '../auth.constants';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';
import { UserRoleService } from '../../user-role/services/user-role.service';
import { UserType } from '../../base-entities/enums/user-type.enum';
import { getRoutePermission } from '../permissions/permission.util';

/**
 * Contrôle les rôles et les permissions métier, après `JwtAuthGuard`.
 *
 * Sans permission explicite, déduit une permission CRUD ou métier du chemin
 * de la route. Les décisions utilisent les assignations actuelles, pas les
 * rôles potentiellement périmés du jeton d'accès.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly userRoleService: UserRoleService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) {
      return true;
    }

    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      targets,
    );
    const explicitPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      targets,
    );
    const routePermission = getRoutePermission(
      context.getClass(),
      context.getHandler(),
    );
    const requiredPermissions =
      explicitPermissions ?? (routePermission ? [routePermission] : []);
    if (
      (!requiredRoles || requiredRoles.length === 0) &&
      requiredPermissions.length === 0
    ) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();
    const user = request.user;
    if (!user) {
      throw new UnauthorizedException('Utilisateur non authentifié');
    }

    if (user.user_type === UserType.SUPER_ADMIN) {
      return true;
    }

    const propertyId =
      request.params?.propertyId ??
      request.params?.property_id ??
      (request.body as { property_id?: unknown } | undefined)?.property_id ??
      request.query?.property_id;
    const scopedPropertyId =
      typeof propertyId === 'string' && Types.ObjectId.isValid(propertyId)
        ? propertyId
        : undefined;
    const access = await this.userRoleService.getUserAccess(user.sub, {
      userType: user.user_type,
      ...(scopedPropertyId ? { propertyId: scopedPropertyId } : {}),
    });
    const userRoles = new Set([user.user_type, ...access.roleCodes]);

    if (userRoles.has(SUPER_ADMIN_ROLE)) {
      return true;
    }

    if (
      requiredRoles?.length &&
      !requiredRoles.some((role) => userRoles.has(role))
    ) {
      throw new ForbiddenException('Accès refusé : rôle insuffisant');
    }

    const missingPermissions = requiredPermissions.filter(
      (permission) =>
        !UserRoleService.matchPermission(access.permissions, permission),
    );
    if (missingPermissions.length > 0) {
      throw new ForbiddenException(
        `Accès refusé : permission requise (${missingPermissions.join(', ')})`,
      );
    }
    return true;
  }
}
