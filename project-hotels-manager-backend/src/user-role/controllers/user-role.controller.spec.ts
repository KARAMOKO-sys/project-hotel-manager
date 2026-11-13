/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { UserRoleController } from './user-role.controller';
import { UserRoleService } from '../services/user-role.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { UserType } from '../../base-entities/enums/user-type.enum';
import { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';

describe('UserRoleController', () => {
  let controller: UserRoleController;
  let service: Record<string, jest.Mock>;
  const owner: AuthenticatedUser = {
    sub: new Types.ObjectId().toString(),
    user_type: UserType.OWNER,
    email: 'owner@test.com',
    roles: ['owner'],
  };

  beforeEach(async () => {
    service = {
      getUserRoles: jest.fn().mockResolvedValue([]),
      getUserPermissions: jest.fn().mockResolvedValue(['a:b']),
      assignRole: jest.fn().mockResolvedValue({}),
      removeById: jest.fn().mockResolvedValue(undefined),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserRoleController],
      providers: [{ provide: UserRoleService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();
    controller = module.get(UserRoleController);
  });

  it('returns my roles and permissions', async () => {
    await controller.findMine(owner, {});
    expect(service.getUserRoles).toHaveBeenCalledWith(owner.sub, {
      userType: UserType.OWNER,
      propertyId: undefined,
    });
    await expect(controller.findMyPermissions(owner, {})).resolves.toEqual([
      'a:b',
    ]);
  });

  it('passes the assigner (not super admin) when assigning', async () => {
    const dto = {
      user_id: new Types.ObjectId().toString(),
      user_type: UserType.GUEST,
      role_id: new Types.ObjectId().toString(),
    };
    await controller.assign(dto, owner);
    expect(service.assignRole).toHaveBeenCalledWith(dto, {
      id: owner.sub,
      user_type: UserType.OWNER,
      is_super_admin: false,
    });
  });

  it('flags super admins when assigning', async () => {
    const admin = { ...owner, user_type: UserType.SUPER_ADMIN, roles: [] };
    await controller.assign({} as any, admin);
    expect(service.assignRole.mock.calls[0][1].is_super_admin).toBe(true);
  });

  it('delegates user lookups and removal', async () => {
    const id = new Types.ObjectId().toString();
    await controller.findByUser({ id }, { user_type: UserType.GUEST });
    await controller.findPermissions({ id }, {});
    await controller.remove({ id });
    expect(service.getUserRoles).toHaveBeenCalledWith(id, {
      userType: UserType.GUEST,
      propertyId: undefined,
    });
    expect(service.removeById).toHaveBeenCalledWith(id);
  });
});
