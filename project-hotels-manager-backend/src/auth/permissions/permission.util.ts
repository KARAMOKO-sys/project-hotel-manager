import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';

export function getRoutePermission(
  controller: object,
  handler: object,
): string | undefined {
  const controllerPath = Reflect.getMetadata(PATH_METADATA, controller) as
    | string
    | string[]
    | undefined;
  const controllerResource = Array.isArray(controllerPath)
    ? controllerPath[0]
    : controllerPath;
  const controllerName =
    'name' in controller && typeof controller.name === 'string'
      ? controller.name
      : '';
  const resource =
    normalizePermissionPart(controllerResource) ??
    normalizePermissionPart(controllerName.replace(/Controller$/, ''));
  if (!resource) {
    return undefined;
  }

  const routePath = Reflect.getMetadata(PATH_METADATA, handler) as
    | string
    | string[]
    | undefined;
  const route = Array.isArray(routePath) ? routePath[0] : routePath;
  const routeSegments = route
    ?.split('/')
    .filter((segment) => segment && !segment.startsWith(':'));
  const feature = routeSegments?.[routeSegments.length - 1];
  const method = Reflect.getMetadata(METHOD_METADATA, handler) as
    | RequestMethod
    | undefined;
  const action = normalizePermissionPart(feature) ?? actionForMethod(method);
  return action ? `${resource}:${action}` : undefined;
}

function actionForMethod(
  method?: RequestMethod,
): 'read' | 'create' | 'update' | 'delete' | undefined {
  switch (method) {
    case RequestMethod.GET:
    case RequestMethod.HEAD:
      return 'read';
    case RequestMethod.POST:
      return 'create';
    case RequestMethod.PUT:
    case RequestMethod.PATCH:
      return 'update';
    case RequestMethod.DELETE:
      return 'delete';
    default:
      return undefined;
  }
}

function normalizePermissionPart(value?: string): string | undefined {
  const part = value
    ?.split('/')
    .filter(Boolean)
    .join('-')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .toLowerCase();
  return part || undefined;
}
