import { Injectable } from '@nestjs/common';
import { DiscoveryService, Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY, PERMISSIONS_KEY } from '../auth.constants';
import { getRoutePermission } from './permission.util';

export interface PermissionCatalogEntry {
  module: string;
  actions: string[];
  permissions: string[];
}

@Injectable()
export class PermissionCatalogService {
  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly reflector: Reflector,
  ) {}

  list(): PermissionCatalogEntry[] {
    const permissionsByModule = new Map<string, Set<string>>();

    for (const wrapper of this.discoveryService.getControllers()) {
      const controller = wrapper.metatype;
      if (!controller) {
        continue;
      }
      const controllerPrototype = controller.prototype as Record<
        string,
        unknown
      >;

      for (const methodName of Object.getOwnPropertyNames(
        controller.prototype,
      )) {
        if (methodName === 'constructor') {
          continue;
        }

        const handler = controllerPrototype[methodName];
        if (typeof handler !== 'function') {
          continue;
        }

        const targets = [handler, controller];
        if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) {
          continue;
        }

        const explicitPermissions = this.reflector.getAllAndOverride<string[]>(
          PERMISSIONS_KEY,
          targets,
        );
        const routePermission = getRoutePermission(controller, handler);
        if (!explicitPermissions?.length && !routePermission) {
          continue;
        }

        const permissions = explicitPermissions?.length
          ? explicitPermissions
          : [routePermission!];
        for (const permission of permissions) {
          const separator = permission.indexOf(':');
          if (separator < 1) {
            continue;
          }
          const resource = permission.slice(0, separator);
          const modulePermissions =
            permissionsByModule.get(resource) ?? new Set<string>();
          modulePermissions.add(permission);
          permissionsByModule.set(resource, modulePermissions);
        }
      }
    }

    return [...permissionsByModule.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([module, permissions]) => ({
        module,
        actions: [
          ...new Set(
            [...permissions].map((permission) =>
              permission.slice(permission.indexOf(':') + 1),
            ),
          ),
        ].sort(),
        permissions: [...permissions].sort(),
      }));
  }
}
