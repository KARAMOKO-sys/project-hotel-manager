import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { AdminsService } from './admins.service';
import { AdminStatus, SuperAdmin } from '../schemas/admin.entity';
import { CreateAdminDto } from '../dto/create-admin.dto';

type Doc = Record<string, unknown>;

/** Simule une requête Mongoose chaînable se résolvant sur `value`. */
const mockQuery = (value: unknown) => {
  const query = {
    sort: jest.fn(),
    skip: jest.fn(),
    limit: jest.fn(),
    lean: jest.fn(),
    select: jest.fn(),
    populate: jest.fn(),
    exec: jest.fn().mockResolvedValue(value),
  };
  query.sort.mockReturnValue(query);
  query.skip.mockReturnValue(query);
  query.limit.mockReturnValue(query);
  query.lean.mockReturnValue(query);
  query.select.mockReturnValue(query);
  query.populate.mockReturnValue(query);
  return query;
};

/** Simule un modèle Mongoose (constructeur + méthodes statiques). */
const createModelMock = (doc: Doc) =>
  Object.assign(
    jest.fn().mockImplementation((data: Doc) => {
      const created: Doc = { _id: new Types.ObjectId(), ...data };
      created.save = jest
        .fn()
        .mockResolvedValue({ ...created, toObject: () => ({ ...created }) });
      return created;
    }),
    {
      findById: jest.fn().mockReturnValue(mockQuery(doc)),
      findOne: jest.fn().mockReturnValue(mockQuery(doc)),
      find: jest.fn().mockReturnValue(mockQuery([doc])),
      findByIdAndUpdate: jest
        .fn()
        .mockImplementation((_id: unknown, update: Doc) =>
          mockQuery({ ...doc, ...update }),
        ),
      countDocuments: jest.fn().mockReturnValue(mockQuery(1)),
      exists: jest.fn().mockResolvedValue(null),
    },
  );

describe('AdminsService', () => {
  let service: AdminsService;
  let model: ReturnType<typeof createModelMock>;

  const id = new Types.ObjectId().toString();
  const passwordHash = bcrypt.hashSync('OldPassword1', 4);
  const admin: Doc = {
    _id: id,
    email: 'admin@example.com',
    first_name: 'Awa',
    last_name: 'Koné',
    phone: '+2250700000000',
    status: AdminStatus.ACTIVE,
    access_level: 5,
    ip_whitelist: [],
    is_active: true,
  };

  beforeEach(async () => {
    model = createModelMock(admin);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminsService,
        { provide: getModelToken(SuperAdmin.name), useValue: model },
      ],
    }).compile();

    service = module.get<AdminsService>(AdminsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const dto: CreateAdminDto = {
      email: 'New.Admin@Example.com',
      password: 'Secret123!',
    };

    it('should hash the password and never return the hash', async () => {
      const result = await service.create(dto);

      const [[data]] = model.mock.calls as unknown as Array<[Doc]>;
      expect(data.email).toBe('new.admin@example.com');
      expect(data.alert_email).toBe('new.admin@example.com');
      expect(data).not.toHaveProperty('password');
      await expect(
        bcrypt.compare('Secret123!', data.password_hash as string),
      ).resolves.toBe(true);
      expect(result).not.toHaveProperty('password_hash');
      expect(result.email).toBe('new.admin@example.com');
    });

    it('should reject an email already in use', async () => {
      model.exists.mockResolvedValueOnce({ _id: id });
      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });
  });

  it('should apply the search filter in findAll', async () => {
    const result = await service.findAll({
      page: 1,
      limit: 10,
      search: 'awa',
    });
    expect(model.find).toHaveBeenCalledWith(
      expect.objectContaining({ $or: expect.any(Array) as unknown }),
    );
    expect(result.meta.total).toBe(1);
  });

  it('should reject an update with an email already used', async () => {
    model.exists.mockResolvedValueOnce({ _id: 'other' });
    await expect(
      service.update(id, { email: 'taken@example.com' }),
    ).rejects.toThrow(ConflictException);
  });

  describe('findByEmail', () => {
    it('should return the admin', async () => {
      await expect(service.findByEmail('ADMIN@example.com')).resolves.toEqual(
        admin,
      );
      expect(model.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'admin@example.com' }),
      );
    });

    it('should throw NotFound when unknown', async () => {
      model.findOne.mockReturnValueOnce(mockQuery(null));
      await expect(service.findByEmail('x@example.com')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('search', () => {
    it('should search with an escaped regex', async () => {
      await expect(service.search('a.b')).resolves.toEqual([admin]);
      expect(model.find).toHaveBeenCalledWith(
        expect.objectContaining({
          $or: expect.arrayContaining([
            { first_name: { $regex: 'a\\.b', $options: 'i' } },
          ]) as unknown,
        }),
      );
    });

    it('should reject an empty term', async () => {
      await expect(service.search('  ')).rejects.toThrow(BadRequestException);
    });
  });

  it('should filter by department', async () => {
    await service.findByDepartment('IT', { page: 1, limit: 10 });
    expect(model.find).toHaveBeenCalledWith(
      expect.objectContaining({ department: 'IT' }),
    );
  });

  describe('findByAccessLevel', () => {
    it('should filter by minimum level', async () => {
      await service.findByAccessLevel(3, { page: 1, limit: 10 });
      expect(model.find).toHaveBeenCalledWith(
        expect.objectContaining({ access_level: { $gte: 3 } }),
      );
    });

    it('should reject an invalid level', () => {
      expect(() =>
        service.findByAccessLevel(9, { page: 1, limit: 10 }),
      ).toThrow(BadRequestException);
    });
  });

  it('should activate an admin', async () => {
    const result = await service.activate(id);
    expect(result.is_active).toBe(true);
    expect(result.status).toBe(AdminStatus.ACTIVE);
  });

  it('should deactivate an admin', async () => {
    const result = await service.deactivate(id);
    expect(result.is_active).toBe(false);
    expect(result.status).toBe(AdminStatus.INACTIVE);
  });

  it('should throw NotFound when activating an unknown admin', async () => {
    model.findByIdAndUpdate.mockReturnValueOnce(mockQuery(null));
    await expect(service.activate(id)).rejects.toThrow(NotFoundException);
  });

  describe('suspend', () => {
    it('should suspend an active admin', async () => {
      const result = await service.suspend(id, 'Audit');
      expect(result.status).toBe(AdminStatus.SUSPENDED);
      expect(result.is_active).toBe(false);
    });

    it('should refuse to suspend twice', async () => {
      model.findById.mockReturnValueOnce(
        mockQuery({ ...admin, status: AdminStatus.SUSPENDED }),
      );
      await expect(service.suspend(id)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFound for an unknown admin', async () => {
      model.findById.mockReturnValueOnce(mockQuery(null));
      await expect(service.suspend(id)).rejects.toThrow(NotFoundException);
    });
  });

  describe('reactivate', () => {
    it('should reactivate a suspended admin', async () => {
      model.findById.mockReturnValueOnce(
        mockQuery({ ...admin, status: AdminStatus.SUSPENDED }),
      );
      const result = await service.reactivate(id);
      expect(result.status).toBe(AdminStatus.ACTIVE);
      expect(result.is_active).toBe(true);
    });

    it('should refuse a non suspended admin', async () => {
      await expect(service.reactivate(id)).rejects.toThrow(BadRequestException);
    });
  });

  describe('changePassword', () => {
    beforeEach(() => {
      model.findOne.mockReturnValue(
        mockQuery({ ...admin, password_hash: passwordHash }),
      );
    });

    it('should store a new hash when the current password matches', async () => {
      const result = await service.changePassword(
        id,
        'OldPassword1',
        'NewPassword1',
      );
      const [, update] = model.findByIdAndUpdate.mock.calls[0] as [
        unknown,
        Doc,
      ];
      await expect(
        bcrypt.compare('NewPassword1', update.password_hash as string),
      ).resolves.toBe(true);
      expect(update.failed_login_attempts).toBe(0);
      expect(result).toBeDefined();
    });

    it('should reject a wrong current password', async () => {
      await expect(
        service.changePassword(id, 'wrong', 'NewPassword1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject an unchanged password', async () => {
      await expect(
        service.changePassword(id, 'OldPassword1', 'OldPassword1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFound for an unknown admin', async () => {
      model.findOne.mockReturnValue(mockQuery(null));
      await expect(
        service.changePassword(id, 'OldPassword1', 'NewPassword1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateAccessLevel', () => {
    it('should update the access level', async () => {
      const result = await service.updateAccessLevel(id, 2);
      expect(result.access_level).toBe(2);
    });

    it('should reject an out of range level', () => {
      expect(() => service.updateAccessLevel(id, 0)).toThrow(
        BadRequestException,
      );
    });
  });

  describe('updateIpWhitelist', () => {
    it('should deduplicate the IP list', async () => {
      const result = await service.updateIpWhitelist(id, [
        '10.0.0.1',
        '10.0.0.1',
        '::1',
      ]);
      expect(result.ip_whitelist).toEqual(['10.0.0.1', '::1']);
    });

    it('should reject invalid IPs', () => {
      expect(() => service.updateIpWhitelist(id, ['not-an-ip'])).toThrow(
        BadRequestException,
      );
    });
  });

  describe('isIpAllowed', () => {
    it('should allow any IP with an empty whitelist', async () => {
      await expect(service.isIpAllowed(id, '1.2.3.4')).resolves.toEqual({
        allowed: true,
      });
    });

    it('should refuse an IP outside the whitelist', async () => {
      model.findById.mockReturnValueOnce(
        mockQuery({ ...admin, ip_whitelist: ['10.0.0.1'] }),
      );
      await expect(service.isIpAllowed(id, '1.2.3.4')).resolves.toEqual({
        allowed: false,
      });
    });
  });

  it('should mark the account as audited', async () => {
    const result = await service.markAudited(id);
    expect(result.last_audit_at).toBeInstanceOf(Date);
  });

  it('should fall back to the main contact for alerts', async () => {
    await expect(service.getAlertContact(id)).resolves.toEqual({
      email: 'admin@example.com',
      phone: '+2250700000000',
    });
  });
});
