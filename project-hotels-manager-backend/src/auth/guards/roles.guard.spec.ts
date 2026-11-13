/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import {
  ExecutionContext,
  ForbiddenException,
  RequestMethod,
  UnauthorizedException,
} from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { IS_PUBLIC_KEY, PERMISSIONS_KEY, ROLES_KEY } from '../auth.constants';
import { UserType } from '../../base-entities/enums/user-type.enum';
import { UserRoleService } from '../../user-role/services/user-role.service';

function createContext(
  user?: any,
  handler: () => undefined = () => undefined,
  controller: new () => object = class {},
) {
  return {
    getHandler: () => handler,
    getClass: () => controller,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  let reflector: Reflector;
  let guard: RolesGuard;
  let metadata: Record<string, unknown>;
  let userRoleService: { getUserAccess: jest.Mock };

  beforeEach(() => {
    reflector = new Reflector();
    metadata = {};
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockImplementation((key: any) => metadata[key]);
    userRoleService = {
      getUserAccess: jest.fn().mockResolvedValue({
        roleCodes: [],
        permissions: [],
      }),
    };
    guard = new RolesGuard(
      reflector,
      userRoleService as unknown as UserRoleService,
    );
  });

  const guest = {
    sub: '1',
    user_type: UserType.GUEST,
    email: 'a',
    roles: ['guest'],
  };

  it('allows routes without role or permission metadata', async () => {
    await expect(guard.canActivate(createContext(guest))).resolves.toBe(true);
  });

  it('allows public routes', async () => {
    metadata[IS_PUBLIC_KEY] = true;
    metadata[ROLES_KEY] = ['owner'];
    await expect(guard.canActivate(createContext())).resolves.toBe(true);
  });

  it('throws 401 when no user is attached', async () => {
    metadata[ROLES_KEY] = ['owner'];
    await expect(guard.canActivate(createContext())).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('throws 403 on role mismatch', async () => {
    metadata[ROLES_KEY] = ['owner', 'receptionist'];
    await expect(
      guard.canActivate(createContext(guest)),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('accepts a role currently assigned in the database', async () => {
    metadata[ROLES_KEY] = ['owner'];
    userRoleService.getUserAccess.mockResolvedValue({
      roleCodes: ['owner'],
      permissions: [],
    });
    await expect(
      guard.canActivate(createContext({ ...guest, roles: ['guest'] })),
    ).resolves.toBe(true);
  });

  it('accepts the user type even if not listed in roles', async () => {
    metadata[ROLES_KEY] = ['guest'];
    await expect(
      guard.canActivate(createContext({ ...guest, roles: [] })),
    ).resolves.toBe(true);
  });

  it('checks permissions against the current role assignments', async () => {
    metadata[PERMISSIONS_KEY] = ['reservations:read'];
    userRoleService.getUserAccess.mockResolvedValue({
      roleCodes: ['manager'],
      permissions: ['reservations:*'],
    });
    await expect(guard.canActivate(createContext(guest))).resolves.toBe(true);
  });

  it('derives a CRUD permission from the route module and HTTP method', async () => {
    const controller = class ReservationsController {};
    const handler = () => undefined;
    Reflect.defineMetadata(PATH_METADATA, 'reservations', controller);
    Reflect.defineMetadata(METHOD_METADATA, RequestMethod.GET, handler);
    userRoleService.getUserAccess.mockResolvedValue({
      roleCodes: ['manager'],
      permissions: ['reservations:read'],
    });

    await expect(
      guard.canActivate(createContext(guest, handler, controller)),
    ).resolves.toBe(true);
    expect(userRoleService.getUserAccess).toHaveBeenCalledWith(
      guest.sub,
      expect.objectContaining({ userType: UserType.GUEST }),
    );
  });

  it('derives a distinct permission for a named business operation', async () => {
    const controller = class ReservationsController {};
    const handler = () => undefined;
    Reflect.defineMetadata(PATH_METADATA, 'reservations', controller);
    Reflect.defineMetadata(PATH_METADATA, ':id/check-in', handler);
    Reflect.defineMetadata(METHOD_METADATA, RequestMethod.PATCH, handler);
    userRoleService.getUserAccess.mockResolvedValue({
      roleCodes: ['manager'],
      permissions: ['reservations:check-in'],
    });

    await expect(
      guard.canActivate(createContext(guest, handler, controller)),
    ).resolves.toBe(true);
  });

  it('does not trust stale permission claims from the JWT', async () => {
    metadata[PERMISSIONS_KEY] = ['reservations:read'];
    await expect(
      guard.canActivate(
        createContext({ ...guest, roles: ['super_admin', 'manager'] }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('lets super admins through', async () => {
    metadata[ROLES_KEY] = ['accountant'];
    await expect(
      guard.canActivate(
        createContext({ ...guest, user_type: UserType.SUPER_ADMIN, roles: [] }),
      ),
    ).resolves.toBe(true);
  });
});
