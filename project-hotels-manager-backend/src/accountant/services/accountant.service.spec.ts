import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { AccountantService } from './accountant.service';
import { Accountant, AccountantStatus } from '../schemas/accountant.entity';
import { CreateAccountantDto } from '../dto/create-accountant.dto';

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

describe('AccountantService', () => {
  let service: AccountantService;
  let model: ReturnType<typeof createModelMock>;

  const id = new Types.ObjectId().toString();
  const propertyId = new Types.ObjectId().toString();
  const passwordHash = bcrypt.hashSync('OldPassword1', 4);
  const accountant: Doc = {
    _id: id,
    email: 'compta@example.com',
    employee_code: 'ACC-001',
    property_id: propertyId,
    status: AccountantStatus.ACTIVE,
    is_active: true,
    approval_limit: 5000,
    certifications: [],
  };

  beforeEach(async () => {
    model = createModelMock(accountant);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountantService,
        { provide: getModelToken(Accountant.name), useValue: model },
      ],
    }).compile();

    service = module.get<AccountantService>(AccountantService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const dto: CreateAccountantDto = {
      email: 'New@Example.com',
      password: 'Secret123!',
      property_id: propertyId,
      employee_code: 'ACC-002',
    };

    it('should hash the password and never return the hash', async () => {
      const result = await service.create(dto);
      const [[data]] = model.mock.calls as unknown as Array<[Doc]>;
      expect(data.email).toBe('new@example.com');
      expect(data.property_id).toBeInstanceOf(Types.ObjectId);
      await expect(
        bcrypt.compare('Secret123!', data.password_hash as string),
      ).resolves.toBe(true);
      expect(result).not.toHaveProperty('password_hash');
    });

    it('should reject a duplicate email', async () => {
      model.exists.mockResolvedValueOnce({ _id: id });
      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('should reject a duplicate employee code', async () => {
      model.exists
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ _id: id });
      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('should reject an invalid property id', async () => {
      await expect(
        service.create({ ...dto, property_id: 'bad' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  it('should reject an update with a duplicate employee code', async () => {
    model.exists.mockResolvedValueOnce({ _id: 'other' });
    await expect(
      service.update(id, { employee_code: 'ACC-009' }),
    ).rejects.toThrow(ConflictException);
  });

  it('should apply the search filter in findAll', async () => {
    await service.findAll({ page: 1, limit: 10, search: 'compta' });
    expect(model.find).toHaveBeenCalledWith(
      expect.objectContaining({ $or: expect.any(Array) as unknown }),
    );
  });

  describe('findByEmail / findByEmployeeCode', () => {
    it('should find by email', async () => {
      await expect(service.findByEmail('COMPTA@example.com')).resolves.toEqual(
        accountant,
      );
    });

    it('should throw NotFound for an unknown email', async () => {
      model.findOne.mockReturnValueOnce(mockQuery(null));
      await expect(service.findByEmail('x@example.com')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should find by employee code', async () => {
      await expect(service.findByEmployeeCode('ACC-001')).resolves.toEqual(
        accountant,
      );
    });

    it('should throw NotFound for an unknown employee code', async () => {
      model.findOne.mockReturnValueOnce(mockQuery(null));
      await expect(service.findByEmployeeCode('NOPE')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('search', () => {
    it('should return matches', async () => {
      await expect(service.search('compta')).resolves.toEqual([accountant]);
    });

    it('should reject an empty term', async () => {
      await expect(service.search('')).rejects.toThrow(BadRequestException);
    });
  });

  describe('findByProperty', () => {
    it('should filter by property and status', async () => {
      await service.findByProperty(
        propertyId,
        { page: 1, limit: 10 },
        AccountantStatus.ACTIVE,
      );
      expect(model.find).toHaveBeenCalledWith(
        expect.objectContaining({
          property_id: new Types.ObjectId(propertyId),
          status: AccountantStatus.ACTIVE,
        }),
      );
    });

    it('should reject an invalid property id', () => {
      expect(() =>
        service.findByProperty('bad', { page: 1, limit: 10 }),
      ).toThrow(BadRequestException);
    });

    it('should reject an invalid status', () => {
      expect(() =>
        service.findByProperty(
          propertyId,
          { page: 1, limit: 10 },
          'bogus' as AccountantStatus,
        ),
      ).toThrow(BadRequestException);
    });
  });

  it('should activate and deactivate', async () => {
    await expect(service.activate(id)).resolves.toMatchObject({
      is_active: true,
      status: AccountantStatus.ACTIVE,
    });
    await expect(service.deactivate(id)).resolves.toMatchObject({
      is_active: false,
      status: AccountantStatus.INACTIVE,
    });
  });

  it('should throw NotFound when deactivating an unknown accountant', async () => {
    model.findByIdAndUpdate.mockReturnValueOnce(mockQuery(null));
    await expect(service.deactivate(id)).rejects.toThrow(NotFoundException);
  });

  describe('suspend / reactivate', () => {
    it('should suspend an active accountant', async () => {
      await expect(service.suspend(id, 'Fraude')).resolves.toMatchObject({
        status: AccountantStatus.SUSPENDED,
        is_active: false,
      });
    });

    it('should refuse to suspend twice', async () => {
      model.findById.mockReturnValueOnce(
        mockQuery({ ...accountant, status: AccountantStatus.SUSPENDED }),
      );
      await expect(service.suspend(id)).rejects.toThrow(BadRequestException);
    });

    it('should reactivate a suspended accountant', async () => {
      model.findById.mockReturnValueOnce(
        mockQuery({ ...accountant, status: AccountantStatus.SUSPENDED }),
      );
      await expect(service.reactivate(id)).resolves.toMatchObject({
        status: AccountantStatus.ACTIVE,
      });
    });

    it('should refuse to reactivate an active accountant', async () => {
      await expect(service.reactivate(id)).rejects.toThrow(BadRequestException);
    });
  });

  describe('changePassword', () => {
    beforeEach(() => {
      model.findOne.mockReturnValue(
        mockQuery({ ...accountant, password_hash: passwordHash }),
      );
    });

    it('should store a new hash', async () => {
      await service.changePassword(id, 'OldPassword1', 'NewPassword1');
      const [, update] = model.findByIdAndUpdate.mock.calls[0] as [
        unknown,
        Doc,
      ];
      await expect(
        bcrypt.compare('NewPassword1', update.password_hash as string),
      ).resolves.toBe(true);
    });

    it('should reject a wrong current password', async () => {
      await expect(
        service.changePassword(id, 'bad', 'NewPassword1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject an identical password', async () => {
      await expect(
        service.changePassword(id, 'OldPassword1', 'OldPassword1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFound for an unknown accountant', async () => {
      model.findOne.mockReturnValue(mockQuery(null));
      await expect(
        service.changePassword(id, 'OldPassword1', 'NewPassword1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updatePermissions', () => {
    it('should only update provided fields', async () => {
      await service.updatePermissions(id, {
        can_process_refunds: true,
        approval_limit: 10000,
      });
      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
        id,
        { can_process_refunds: true, approval_limit: 10000 },
        expect.anything(),
      );
    });

    it('should reject an empty payload', () => {
      expect(() => service.updatePermissions(id, {})).toThrow(
        BadRequestException,
      );
    });

    it('should reject a negative approval limit', () => {
      expect(() =>
        service.updatePermissions(id, { approval_limit: -1 }),
      ).toThrow(BadRequestException);
    });
  });

  describe('checkApproval', () => {
    it('should allow an amount within the limit', async () => {
      await expect(service.checkApproval(id, 1000)).resolves.toEqual({
        allowed: true,
        amount: 1000,
        approval_limit: 5000,
      });
    });

    it('should refuse an amount above the limit', async () => {
      const result = await service.checkApproval(id, 9000);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it('should refuse when the account is suspended', async () => {
      model.findById.mockReturnValueOnce(
        mockQuery({ ...accountant, status: AccountantStatus.SUSPENDED }),
      );
      const result = await service.checkApproval(id, 10);
      expect(result.allowed).toBe(false);
    });

    it('should reject a negative amount', async () => {
      await expect(service.checkApproval(id, -5)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('certifications', () => {
    it('should add a certification without duplicates', async () => {
      await service.addCertification(id, ' DSCG ');
      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
        id,
        { $addToSet: { certifications: 'DSCG' } },
        expect.anything(),
      );
    });

    it('should remove a certification', async () => {
      await service.removeCertification(id, 'DSCG');
      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
        id,
        { $pull: { certifications: 'DSCG' } },
        expect.anything(),
      );
    });

    it('should reject an empty certification', () => {
      expect(() => service.addCertification(id, '  ')).toThrow(
        BadRequestException,
      );
    });
  });
});
