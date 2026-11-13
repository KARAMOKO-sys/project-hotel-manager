import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { PartnerService } from './partner.service';
import { Partner, PartnerStatus, PartnerType } from '../schemas/partner.entity';
import { CreatePartnerDto } from '../dto/create-partner.dto';

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
      updateMany: jest.fn().mockReturnValue(mockQuery({ modifiedCount: 3 })),
      aggregate: jest.fn().mockReturnValue(mockQuery([])),
    },
  );

describe('PartnerService', () => {
  let service: PartnerService;
  let model: ReturnType<typeof createModelMock>;

  const id = new Types.ObjectId().toString();
  const propertyId = new Types.ObjectId().toString();
  const passwordHash = bcrypt.hashSync('OldPassword1', 4);
  const partner: Doc = {
    _id: id,
    email: 'agence@example.com',
    company_name: 'Agence Lagune',
    partner_type: PartnerType.REAL_ESTATE_AGENCY,
    partner_status: PartnerStatus.ACTIVE,
    is_active: true,
    verified_at: new Date('2025-01-01'),
    registration_document_url: 'https://docs/rccm.pdf',
    commission_rate: 10,
    max_properties: 2,
    total_properties_listed: 1,
    property_ids: [propertyId],
    rating: 4,
    total_reviews: 1,
  };

  beforeEach(async () => {
    model = createModelMock(partner);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PartnerService,
        { provide: getModelToken(Partner.name), useValue: model },
      ],
    }).compile();

    service = module.get<PartnerService>(PartnerService);
  });

  const withDoc = (overrides: Doc) =>
    model.findById.mockReturnValueOnce(mockQuery({ ...partner, ...overrides }));

  const lastUpdate = () => {
    const calls = model.findByIdAndUpdate.mock.calls as Array<[unknown, Doc]>;
    return calls[calls.length - 1][1];
  };

  const pending = { partner_status: PartnerStatus.PENDING, verified_at: null };

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const dto: CreatePartnerDto = {
      email: 'New@Example.com',
      password: 'Secret123!',
      first_name: 'Awa',
      last_name: 'Traoré',
      phone: '+2250101010101',
      company_name: 'Immo CI',
      partner_type: PartnerType.DEVELOPER,
      terms_accepted: true,
      data_processing_accepted: true,
    };

    it('should register a pending partner with default contacts', async () => {
      const result = await service.create(dto);
      const [[data]] = model.mock.calls as unknown as Array<[Doc]>;
      expect(data).toMatchObject({
        email: 'new@example.com',
        partner_status: PartnerStatus.PENDING,
        contact_name: 'Awa Traoré',
        contact_email: 'new@example.com',
        contact_phone: '+2250101010101',
      });
      expect(data).not.toHaveProperty('terms_accepted');
      expect(data.metadata).toMatchObject({ terms_version: '1.0' });
      await expect(
        bcrypt.compare('Secret123!', data.password_hash as string),
      ).resolves.toBe(true);
      expect(result).not.toHaveProperty('password_hash');
    });

    it('should require the terms to be accepted', async () => {
      await expect(
        service.create({ ...dto, terms_accepted: false }),
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
    await expect(service.findByEmail('agence@example.com')).resolves.toBe(
      partner,
    );
    model.findOne.mockReturnValueOnce(mockQuery(null));
    await expect(service.findByEmail('x@example.com')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should search and reject an empty term', async () => {
    await expect(service.search('lagune')).resolves.toEqual([partner]);
    await expect(service.search('')).rejects.toThrow(BadRequestException);
  });

  it('should filter by status, type and pending', async () => {
    await service.findByStatus(PartnerStatus.BLOCKED, { page: 1, limit: 10 });
    expect(model.find).toHaveBeenLastCalledWith(
      expect.objectContaining({ partner_status: PartnerStatus.BLOCKED }),
    );
    await service.findByType(PartnerType.DEVELOPER, { page: 1, limit: 10 });
    expect(model.find).toHaveBeenLastCalledWith(
      expect.objectContaining({
        partner_type: PartnerType.DEVELOPER,
        partner_status: PartnerStatus.ACTIVE,
      }),
    );
    await service.findPending({ page: 1, limit: 10 });
    expect(model.find).toHaveBeenLastCalledWith(
      expect.objectContaining({ partner_status: PartnerStatus.PENDING }),
    );
    expect(() =>
      service.findByStatus('x' as PartnerStatus, { page: 1, limit: 10 }),
    ).toThrow(BadRequestException);
    expect(() =>
      service.findByType('x' as PartnerType, { page: 1, limit: 10 }),
    ).toThrow(BadRequestException);
  });

  describe('approve', () => {
    it('should approve a pending partner', async () => {
      withDoc(pending);
      const adminId = new Types.ObjectId().toString();
      const result = await service.approve(id, adminId);
      expect(result.partner_status).toBe(PartnerStatus.ACTIVE);
      expect(lastUpdate().verified_by).toEqual(new Types.ObjectId(adminId));
      expect(lastUpdate().verified_at).toBeInstanceOf(Date);
    });

    it('should refuse a partner that is not pending', async () => {
      await expect(service.approve(id)).rejects.toThrow(BadRequestException);
    });

    it('should require the registration document', async () => {
      withDoc({ ...pending, registration_document_url: undefined });
      await expect(service.approve(id)).rejects.toThrow(/immatriculation/);
    });

    it('should throw NotFound for an unknown partner', async () => {
      model.findById.mockReturnValueOnce(mockQuery(null));
      await expect(service.approve(id)).rejects.toThrow(NotFoundException);
    });
  });

  describe('reject', () => {
    it('should reject a pending partner with a reason', async () => {
      withDoc(pending);
      await expect(
        service.reject(id, 'Dossier incomplet'),
      ).resolves.toMatchObject({
        partner_status: PartnerStatus.REJECTED,
        rejection_reason: 'Dossier incomplet',
      });
    });

    it('should require a reason', async () => {
      await expect(service.reject(id, '  ')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should refuse an active partner', async () => {
      await expect(service.reject(id, 'Raison')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('suspend / reactivate / block', () => {
    it('should suspend an active partner', async () => {
      await expect(service.suspend(id)).resolves.toMatchObject({
        partner_status: PartnerStatus.SUSPENDED,
      });
    });

    it('should refuse to suspend a pending partner', async () => {
      withDoc(pending);
      await expect(service.suspend(id)).rejects.toThrow(BadRequestException);
    });

    it('should reactivate a suspended partner', async () => {
      withDoc({ partner_status: PartnerStatus.SUSPENDED });
      await expect(service.reactivate(id)).resolves.toMatchObject({
        partner_status: PartnerStatus.ACTIVE,
      });
    });

    it('should refuse to reactivate an active partner', async () => {
      await expect(service.reactivate(id)).rejects.toThrow(BadRequestException);
    });

    it('should block a partner', async () => {
      await expect(service.block(id, 'Fraude')).resolves.toMatchObject({
        partner_status: PartnerStatus.BLOCKED,
        is_active: false,
      });
    });

    it('should refuse to block twice', async () => {
      withDoc({ partner_status: PartnerStatus.BLOCKED });
      await expect(service.block(id, 'Fraude')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('activate / deactivate', () => {
    it('should activate an approved partner', async () => {
      withDoc({ partner_status: PartnerStatus.INACTIVE });
      await expect(service.activate(id)).resolves.toMatchObject({
        partner_status: PartnerStatus.ACTIVE,
      });
    });

    it('should refuse to activate a partner never approved', async () => {
      withDoc(pending);
      await expect(service.activate(id)).rejects.toThrow(BadRequestException);
    });

    it('should refuse to activate a blocked partner', async () => {
      withDoc({ partner_status: PartnerStatus.BLOCKED });
      await expect(service.activate(id)).rejects.toThrow(BadRequestException);
    });

    it('should deactivate', async () => {
      await expect(service.deactivate(id)).resolves.toMatchObject({
        partner_status: PartnerStatus.INACTIVE,
        is_active: false,
      });
    });
  });

  describe('changePassword', () => {
    beforeEach(() => {
      model.findOne.mockReturnValue(
        mockQuery({ ...partner, password_hash: passwordHash }),
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

    it('should throw NotFound for an unknown partner', async () => {
      model.findOne.mockReturnValue(mockQuery(null));
      await expect(
        service.changePassword(id, 'OldPassword1', 'NewPassword1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  it('should update the commission rate within bounds', async () => {
    await expect(service.updateCommissionRate(id, 12.5)).resolves.toMatchObject(
      { commission_rate: 12.5 },
    );
    expect(() => service.updateCommissionRate(id, 120)).toThrow(
      BadRequestException,
    );
  });

  describe('setMaxProperties', () => {
    it('should update the limit', async () => {
      await expect(service.setMaxProperties(id, 5)).resolves.toMatchObject({
        max_properties: 5,
      });
    });

    it('should refuse a limit below the listed properties', async () => {
      withDoc({ total_properties_listed: 3 });
      await expect(service.setMaxProperties(id, 2)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  it('should calculate the commission', async () => {
    await expect(service.calculateCommission(id, 250000)).resolves.toEqual({
      amount: 250000,
      commission_rate: 10,
      commission: 25000,
    });
    await expect(service.calculateCommission(id, -1)).rejects.toThrow(
      BadRequestException,
    );
  });

  describe('recordBooking', () => {
    it('should increment bookings and commission', async () => {
      await service.recordBooking(id, 100000);
      expect(lastUpdate()).toEqual({
        $inc: { total_bookings: 1, total_commission_earned: 10000 },
      });
    });

    it('should refuse a suspended partner', async () => {
      withDoc({ partner_status: PartnerStatus.SUSPENDED });
      await expect(service.recordBooking(id, 100)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('properties', () => {
    const newProperty = new Types.ObjectId().toString();

    it('should add a property', async () => {
      await service.addProperty(id, newProperty);
      expect(lastUpdate()).toEqual({
        $addToSet: { property_ids: newProperty },
        $inc: { total_properties_listed: 1 },
      });
    });

    it('should refuse a duplicate property', async () => {
      await expect(service.addProperty(id, propertyId)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should refuse when the limit is reached', async () => {
      withDoc({ total_properties_listed: 2 });
      await expect(service.addProperty(id, newProperty)).rejects.toThrow(
        /Limite/,
      );
    });

    it('should refuse an invalid property id', async () => {
      await expect(service.addProperty(id, 'bad')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should remove a linked property', async () => {
      await service.removeProperty(id, propertyId);
      expect(lastUpdate()).toEqual({
        $pull: { property_ids: propertyId },
        $inc: { total_properties_listed: -1 },
      });
    });

    it('should throw NotFound when removing an unlinked property', async () => {
      await expect(service.removeProperty(id, newProperty)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  it('should add a review and recompute the average', async () => {
    const result = await service.addReview(id, 5);
    expect(result).toMatchObject({ rating: 4.5, total_reviews: 2 });
    await expect(service.addReview(id, 9)).rejects.toThrow(BadRequestException);
  });

  it('should compute global statistics', async () => {
    model.aggregate.mockReturnValueOnce(
      mockQuery([
        {
          totals: [
            { total: 3, properties: 7, commission: 1500.456, avg_rate: 11 },
          ],
          by_status: [
            { _id: 'active', count: 2 },
            { _id: 'pending', count: 1 },
          ],
          by_type: [{ _id: 'developer', count: 3 }],
        },
      ]),
    );
    await expect(service.getStatistics()).resolves.toEqual({
      total: 3,
      by_status: { active: 2, pending: 1 },
      by_type: { developer: 3 },
      total_properties_listed: 7,
      total_commission_earned: 1500.46,
      avg_commission_rate: 11,
    });
  });

  it('should return empty statistics without partners', async () => {
    model.aggregate.mockReturnValueOnce(
      mockQuery([{ totals: [], by_status: [], by_type: [] }]),
    );
    await expect(service.getStatistics()).resolves.toMatchObject({
      total: 0,
      by_status: {},
    });
  });
});
