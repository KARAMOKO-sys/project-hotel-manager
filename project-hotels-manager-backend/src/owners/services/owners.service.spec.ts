import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { OwnersService } from './owners.service';
import {
  Owner,
  OwnerStatus,
  OwnerSubscriptionPlan,
} from '../schemas/owner.entity';
import { CreateOwnerDto } from '../dto/create-owner.dto';

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

describe('OwnersService', () => {
  let service: OwnersService;
  let model: ReturnType<typeof createModelMock>;

  const id = new Types.ObjectId().toString();
  const propertyId = new Types.ObjectId();
  const passwordHash = bcrypt.hashSync('OldPassword1', 4);
  const owner: Doc = {
    _id: id,
    email: 'owner@example.com',
    first_name: 'Koffi',
    last_name: 'Yao',
    phone: '+2250700000000',
    country: 'CI',
    id_type: 'national_id',
    id_number: 'CI123',
    id_document_url: 'https://docs/id.pdf',
    business_license_url: 'https://docs/licence.pdf',
    owner_status: OwnerStatus.ACTIVE,
    is_active: true,
    is_verified: true,
    subscription_plan: OwnerSubscriptionPlan.PREMIUM,
    max_properties: 5,
    total_properties_created: 1,
    property_ids: [propertyId],
  };

  beforeEach(async () => {
    model = createModelMock(owner);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OwnersService,
        { provide: getModelToken(Owner.name), useValue: model },
      ],
    }).compile();

    service = module.get<OwnersService>(OwnersService);
  });

  const withDoc = (overrides: Doc) =>
    model.findById.mockReturnValueOnce(mockQuery({ ...owner, ...overrides }));

  const lastUpdate = () => {
    const calls = model.findByIdAndUpdate.mock.calls as Array<[unknown, Doc]>;
    return calls[calls.length - 1][1];
  };

  const pending = {
    owner_status: OwnerStatus.PENDING_VERIFICATION,
    is_verified: false,
  };

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const dto: CreateOwnerDto = {
      email: 'New@Example.com',
      password: 'Secret123!',
    };

    it('should create a pending owner with a hashed password', async () => {
      const result = await service.create(dto);
      const [[data]] = model.mock.calls as unknown as Array<[Doc]>;
      expect(data).toMatchObject({
        email: 'new@example.com',
        owner_status: OwnerStatus.PENDING_VERIFICATION,
        subscription_plan: OwnerSubscriptionPlan.BASIC,
        max_properties: 1,
        is_verified: false,
      });
      await expect(
        bcrypt.compare('Secret123!', data.password_hash as string),
      ).resolves.toBe(true);
      expect(result).not.toHaveProperty('password_hash');
    });

    it('should set a trial expiry date', async () => {
      await service.create({
        ...dto,
        subscription_plan: OwnerSubscriptionPlan.TRIAL,
      });
      const [[data]] = model.mock.calls as unknown as Array<[Doc]>;
      expect(data.subscription_expires_at).toBeInstanceOf(Date);
    });

    it('should reject a minor', async () => {
      const birth = new Date();
      birth.setFullYear(birth.getFullYear() - 10);
      await expect(
        service.create({ ...dto, birth_date: birth.toISOString() }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject a duplicate email', async () => {
      model.exists.mockResolvedValueOnce({ _id: id });
      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });
  });

  it('should reject an update with a duplicate email', async () => {
    model.exists.mockResolvedValueOnce({ _id: 'other' });
    await expect(
      service.update(id, { email: 'taken@example.com' }),
    ).rejects.toThrow(ConflictException);
  });

  it('should find by email or throw NotFound', async () => {
    await expect(service.findByEmail('OWNER@example.com')).resolves.toBe(owner);
    model.findOne.mockReturnValueOnce(mockQuery(null));
    await expect(service.findByEmail('x@example.com')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should search and reject an empty term', async () => {
    await expect(service.search('yao')).resolves.toEqual([owner]);
    await expect(service.search('')).rejects.toThrow(BadRequestException);
  });

  it('should filter by status and reject an invalid one', async () => {
    await service.findByStatus(OwnerStatus.SUSPENDED, { page: 1, limit: 10 });
    expect(model.find).toHaveBeenCalledWith(
      expect.objectContaining({ owner_status: OwnerStatus.SUSPENDED }),
    );
    expect(() =>
      service.findByStatus('x' as OwnerStatus, { page: 1, limit: 10 }),
    ).toThrow(BadRequestException);
  });

  it('should list pending owners oldest first', async () => {
    const result = await service.findPendingVerification({
      page: 1,
      limit: 10,
    });
    expect(model.find).toHaveBeenCalledWith(
      expect.objectContaining({
        owner_status: OwnerStatus.PENDING_VERIFICATION,
      }),
    );
    const query = model.find.mock.results[0].value as ReturnType<
      typeof mockQuery
    >;
    expect(query.sort).toHaveBeenCalledWith('created_at');
    expect(result.data).toEqual([owner]);
  });

  describe('findByProperty', () => {
    it('should return the owner of a property', async () => {
      await expect(service.findByProperty(propertyId.toString())).resolves.toBe(
        owner,
      );
    });

    it('should throw NotFound when no owner matches', async () => {
      model.findOne.mockReturnValueOnce(mockQuery(null));
      await expect(
        service.findByProperty(propertyId.toString()),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject an invalid property id', async () => {
      await expect(service.findByProperty('bad')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  it('should list expiring subscriptions and validate the window', async () => {
    await expect(service.findExpiringSubscriptions(15)).resolves.toEqual([
      owner,
    ]);
    expect(() => service.findExpiringSubscriptions(0)).toThrow(
      BadRequestException,
    );
  });

  describe('verify', () => {
    it('should validate a pending owner with documents', async () => {
      withDoc(pending);
      const adminId = new Types.ObjectId().toString();
      const result = await service.verify(id, adminId);
      expect(result).toMatchObject({
        owner_status: OwnerStatus.ACTIVE,
        is_verified: true,
      });
      expect(lastUpdate().verified_by).toEqual(new Types.ObjectId(adminId));
    });

    it('should refuse an owner already verified', async () => {
      await expect(service.verify(id)).rejects.toThrow(BadRequestException);
    });

    it('should refuse when documents are missing', async () => {
      withDoc({ ...pending, id_document_url: undefined });
      await expect(service.verify(id)).rejects.toThrow(/Documents manquants/);
    });

    it('should throw NotFound for an unknown owner', async () => {
      model.findById.mockReturnValueOnce(mockQuery(null));
      await expect(service.verify(id)).rejects.toThrow(NotFoundException);
    });
  });

  describe('reject', () => {
    it('should reject a pending owner with a reason', async () => {
      withDoc(pending);
      const result = await service.reject(id, 'Pièces illisibles');
      expect(result.owner_status).toBe(OwnerStatus.INACTIVE);
      expect(lastUpdate()['metadata.rejection_reason']).toBe(
        'Pièces illisibles',
      );
    });

    it('should require a reason', async () => {
      await expect(service.reject(id, ' ')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should refuse a non pending owner', async () => {
      await expect(service.reject(id, 'Raison')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('suspend / reactivate', () => {
    it('should suspend an active owner', async () => {
      await expect(service.suspend(id, 'Impayés')).resolves.toMatchObject({
        owner_status: OwnerStatus.SUSPENDED,
        is_active: false,
      });
    });

    it('should refuse to suspend a pending owner', async () => {
      withDoc(pending);
      await expect(service.suspend(id)).rejects.toThrow(BadRequestException);
    });

    it('should reactivate a verified owner as active', async () => {
      withDoc({ owner_status: OwnerStatus.SUSPENDED });
      await expect(service.reactivate(id)).resolves.toMatchObject({
        owner_status: OwnerStatus.ACTIVE,
      });
    });

    it('should send an unverified owner back to verification', async () => {
      withDoc({ owner_status: OwnerStatus.SUSPENDED, is_verified: false });
      await expect(service.reactivate(id)).resolves.toMatchObject({
        owner_status: OwnerStatus.PENDING_VERIFICATION,
      });
    });

    it('should refuse to reactivate an active owner', async () => {
      await expect(service.reactivate(id)).rejects.toThrow(BadRequestException);
    });
  });

  describe('activate / deactivate', () => {
    it('should activate a verified owner', async () => {
      await expect(service.activate(id)).resolves.toMatchObject({
        owner_status: OwnerStatus.ACTIVE,
        is_active: true,
      });
    });

    it('should refuse to activate an unverified owner', async () => {
      withDoc(pending);
      await expect(service.activate(id)).rejects.toThrow(BadRequestException);
    });

    it('should deactivate', async () => {
      await expect(service.deactivate(id)).resolves.toMatchObject({
        owner_status: OwnerStatus.INACTIVE,
        is_active: false,
      });
    });
  });

  describe('changePassword', () => {
    beforeEach(() => {
      model.findOne.mockReturnValue(
        mockQuery({ ...owner, password_hash: passwordHash }),
      );
    });

    it('should store a new hash', async () => {
      await service.changePassword(id, 'OldPassword1', 'NewPassword1');
      await expect(
        bcrypt.compare('NewPassword1', lastUpdate().password_hash as string),
      ).resolves.toBe(true);
    });

    it('should reject a wrong current password', async () => {
      await expect(
        service.changePassword(id, 'bad', 'NewPassword1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFound for an unknown owner', async () => {
      model.findOne.mockReturnValue(mockQuery(null));
      await expect(
        service.changePassword(id, 'OldPassword1', 'NewPassword1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('addProperty', () => {
    const newProperty = new Types.ObjectId().toString();

    it('should link a property and increment the counter', async () => {
      await service.addProperty(id, newProperty);
      expect(lastUpdate()).toMatchObject({
        $addToSet: { property_ids: new Types.ObjectId(newProperty) },
        $inc: { total_properties_created: 1 },
      });
    });

    it('should refuse a property already linked', async () => {
      await expect(
        service.addProperty(id, propertyId.toString()),
      ).rejects.toThrow(ConflictException);
    });

    it('should refuse when the plan limit is reached', async () => {
      withDoc({ max_properties: 1, total_properties_created: 1 });
      await expect(service.addProperty(id, newProperty)).rejects.toThrow(
        /Limite/,
      );
    });

    it('should refuse an expired subscription', async () => {
      withDoc({ subscription_expires_at: new Date('2020-01-01') });
      await expect(service.addProperty(id, newProperty)).rejects.toThrow(
        /expiré/,
      );
    });

    it('should refuse an inactive owner', async () => {
      withDoc(pending);
      await expect(service.addProperty(id, newProperty)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('removeProperty', () => {
    it('should unlink a property and decrement the counter', async () => {
      await service.removeProperty(id, propertyId.toString());
      expect(lastUpdate()).toMatchObject({
        $pull: { property_ids: propertyId },
        $inc: { total_properties_created: -1 },
      });
    });

    it('should throw NotFound for an unlinked property', async () => {
      await expect(
        service.removeProperty(id, new Types.ObjectId().toString()),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateSubscription', () => {
    it('should apply the plan limit', async () => {
      const result = await service.updateSubscription(id, {
        subscription_plan: OwnerSubscriptionPlan.PROFESSIONAL,
      });
      expect(result.max_properties).toBe(20);
    });

    it('should refuse a limit lower than the linked properties', async () => {
      withDoc({ total_properties_created: 3 });
      await expect(
        service.updateSubscription(id, {
          subscription_plan: OwnerSubscriptionPlan.BASIC,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should refuse an expiry date in the past', async () => {
      await expect(
        service.updateSubscription(id, {
          subscription_plan: OwnerSubscriptionPlan.PREMIUM,
          subscription_expires_at: '2020-01-01',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  it('should summarize the subscription', async () => {
    await expect(service.getSubscriptionStatus(id)).resolves.toEqual({
      subscription_plan: OwnerSubscriptionPlan.PREMIUM,
      subscription_expires_at: null,
      is_valid: true,
      days_remaining: null,
      max_properties: 5,
      properties_used: 1,
      remaining_slots: 4,
      can_add_property: true,
    });
  });

  it('should report profile completeness', async () => {
    withDoc({ phone: undefined, business_license_url: undefined });
    await expect(service.getProfileCompleteness(id)).resolves.toEqual({
      is_complete: false,
      missing_fields: ['phone'],
      has_required_documents: false,
      missing_documents: ['contract_document_url|business_license_url'],
    });
  });

  it('should add revenue and reject a non positive amount', async () => {
    await service.addRevenue(id, 150000);
    expect(lastUpdate()).toMatchObject({ $inc: { total_revenue: 150000 } });
    expect(() => service.addRevenue(id, 0)).toThrow(BadRequestException);
  });
});
