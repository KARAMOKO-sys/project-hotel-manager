/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { UserRoleService } from './user-role.service';
import { UserRole } from '../schemas/user-role.entity';
import { Role, RoleLevel } from '../../role/schemas/role.schema';
import { UserType } from '../../base-entities/enums/user-type.enum';

const exec = (value: any) => ({ exec: jest.fn().mockResolvedValue(value) });

describe('UserRoleService', () => {
  let service: UserRoleService;
  let userRoleModel: any;
  let roleModel: any;
  let saved: any[];

  const userId = new Types.ObjectId().toString();
  const guestRole = {
    _id: new Types.ObjectId(),
    name: 'Client',
    code: 'guest',
    role_level: RoleLevel.EXTERNAL,
    permissions: ['reservations:create', 'reservations:read'],
    is_active: true,
  };
  const ownerRole = {
    _id: new Types.ObjectId(),
    name: 'Propriétaire',
    code: 'owner',
    role_level: RoleLevel.MANAGEMENT,
    permissions: ['properties:*', 'reservations:read'],
    is_active: true,
  };
  const adminRole = {
    _id: new Types.ObjectId(),
    name: 'Super admin',
    code: 'super_admin',
    role_level: RoleLevel.SYSTEM,
    permissions: ['*'],
    is_active: true,
  };

  const assignment = (role: any, extra: any = {}) => ({
    _id: new Types.ObjectId(),
    user_id: new Types.ObjectId(userId),
    user_type: UserType.GUEST,
    role_id: role,
    property_id: null,
    expires_at: null,
    ...extra,
  });

  beforeEach(async () => {
    saved = [];
    userRoleModel = function (this: any, data: any) {
      Object.assign(this, { _id: new Types.ObjectId(), ...data });
      this.save = jest.fn().mockImplementation(() => {
        saved.push(this);
        return Promise.resolve(this);
      });
    };
    userRoleModel.findOne = jest.fn().mockReturnValue(exec(null));
    userRoleModel.deleteOne = jest
      .fn()
      .mockReturnValue(exec({ deletedCount: 1 }));
    userRoleModel.find = jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    });

    roleModel = {
      findById: jest.fn().mockReturnValue(exec(guestRole)),
      findOne: jest.fn().mockReturnValue(exec(guestRole)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserRoleService,
        { provide: getModelToken(UserRole.name), useValue: userRoleModel },
        { provide: getModelToken(Role.name), useValue: roleModel },
      ],
    }).compile();
    service = module.get(UserRoleService);
  });

  const mockAssignments = (list: any[]) =>
    userRoleModel.find.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(list),
    });

  describe('assignRole', () => {
    const dto = () => ({
      user_id: userId,
      user_type: UserType.GUEST,
      role_id: guestRole._id.toString(),
    });

    it('creates a new assignment with the assigner', async () => {
      const assigner = new Types.ObjectId().toString();
      const result: any = await service.assignRole(dto(), {
        id: assigner,
        user_type: UserType.SUPER_ADMIN,
        is_super_admin: true,
      });
      expect(saved).toHaveLength(1);
      expect(result.is_active).toBe(true);
      expect(result.property_id).toBeNull();
      expect(result.assigned_by.toString()).toBe(assigner);
    });

    it('throws 404 when the role does not exist', async () => {
      roleModel.findById.mockReturnValue(exec(null));
      await expect(service.assignRole(dto())).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('rejects inactive roles and past expiry dates', async () => {
      roleModel.findById.mockReturnValue(
        exec({ ...guestRole, is_active: false }),
      );
      await expect(service.assignRole(dto())).rejects.toBeInstanceOf(
        BadRequestException,
      );
      roleModel.findById.mockReturnValue(exec(guestRole));
      await expect(
        service.assignRole({ ...dto(), expires_at: '2000-01-01' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws 409 when the role is already active', async () => {
      userRoleModel.findOne.mockReturnValue(
        exec({ is_active: true, expires_at: null }),
      );
      await expect(service.assignRole(dto())).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('reactivates an expired assignment', async () => {
      const existing: any = {
        is_active: false,
        expires_at: new Date(Date.now() - 1000),
        save: jest.fn().mockImplementation(function (this: any) {
          return Promise.resolve(this);
        }),
      };
      userRoleModel.findOne.mockReturnValue(exec(existing));
      await service.assignRole(dto());
      expect(existing.is_active).toBe(true);
      expect(existing.expires_at).toBeNull();
      expect(existing.save).toHaveBeenCalled();
    });

    it('forbids non super admins from assigning system/admin roles', async () => {
      roleModel.findById.mockReturnValue(exec(adminRole));
      await expect(
        service.assignRole(
          { ...dto(), role_id: adminRole._id.toString() },
          { id: new Types.ObjectId().toString(), user_type: UserType.OWNER },
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('assignRoleByCode', () => {
    it('returns null when the role does not exist', async () => {
      roleModel.findOne.mockReturnValue(exec(null));
      await expect(
        service.assignRoleByCode(userId, UserType.GUEST, 'guest'),
      ).resolves.toBeNull();
    });

    it('returns null when already assigned', async () => {
      userRoleModel.findOne.mockReturnValue(exec({ is_active: true }));
      await expect(
        service.assignRoleByCode(userId, UserType.GUEST, 'guest'),
      ).resolves.toBeNull();
    });

    it('assigns the role when it exists', async () => {
      await service.assignRoleByCode(userId, UserType.GUEST, 'guest');
      expect(saved).toHaveLength(1);
    });
  });

  describe('removeRole / removeById', () => {
    it('deletes the assignment', async () => {
      await service.removeRole(
        userId,
        guestRole._id.toString(),
        UserType.GUEST,
      );
      expect(userRoleModel.deleteOne).toHaveBeenCalledWith(
        expect.objectContaining({
          user_type: UserType.GUEST,
          property_id: null,
        }),
      );
    });

    it('throws 404 when nothing was deleted', async () => {
      userRoleModel.deleteOne.mockReturnValue(exec({ deletedCount: 0 }));
      await expect(
        service.removeRole(userId, guestRole._id.toString()),
      ).rejects.toBeInstanceOf(NotFoundException);
      await expect(
        service.removeById(new Types.ObjectId().toString()),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('roles & permissions', () => {
    it('returns resolved roles, ignoring inactive/missing ones', async () => {
      mockAssignments([
        assignment(guestRole),
        assignment(ownerRole),
        assignment({ ...adminRole, is_active: false }),
        assignment(null),
      ]);
      const roles = await service.getUserRoles(userId, {
        userType: UserType.GUEST,
      });
      expect(roles.map((r) => r.role.code)).toEqual(['guest', 'owner']);
    });

    it('filters on global + property scoped roles', async () => {
      const propertyId = new Types.ObjectId().toString();
      await service.getUserRoles(userId, { propertyId });
      const filter = userRoleModel.find.mock.calls[0][0];
      expect(filter.property_id.$in).toHaveLength(2);
      expect(filter.is_active).toBe(true);
      expect(filter.$or).toBeDefined();
    });

    it('returns [] for invalid user ids', async () => {
      await expect(service.getUserRoles('nope')).resolves.toEqual([]);
      expect(userRoleModel.find).not.toHaveBeenCalled();
    });

    it('supports multiple roles (guest + owner) and merges permissions', async () => {
      mockAssignments([assignment(guestRole), assignment(ownerRole)]);
      await expect(service.getUserRoleCodes(userId)).resolves.toEqual([
        'guest',
        'owner',
      ]);
      await expect(service.getUserPermissions(userId)).resolves.toEqual([
        'properties:*',
        'reservations:create',
        'reservations:read',
      ]);
    });

    it('hasPermission handles exact, resource wildcard and global wildcard', async () => {
      mockAssignments([assignment(guestRole), assignment(ownerRole)]);
      await expect(
        service.hasPermission(userId, 'reservations:create'),
      ).resolves.toBe(true);
      await expect(
        service.hasPermission(userId, 'properties:delete'),
      ).resolves.toBe(true);
      await expect(
        service.hasPermission(userId, 'invoices:read'),
      ).resolves.toBe(false);

      mockAssignments([assignment(adminRole)]);
      await expect(service.hasPermission(userId, 'anything:do')).resolves.toBe(
        true,
      );
    });
  });
});
