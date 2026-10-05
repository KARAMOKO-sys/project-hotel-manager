import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { Organization } from '../schemas/organization.entity';

describe('OrganizationService', () => {
  let service: OrganizationService;
  let model: any;

  const userId = new Types.ObjectId();
  const roleId = new Types.ObjectId();

  const organization = {
    _id: new Types.ObjectId(),
    name: 'PleasantStay Group',
    code: 'PSG',
    type: 'group',
    status: 'active',
    settings: { currency: 'XOF' },
    members: [{ user_id: userId, role_id: roleId, joined_at: new Date() }],
  };

  beforeEach(async () => {
    model = {
      findById: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(organization) }),
      findByIdAndUpdate: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(organization) }),
      find: jest.fn(),
      countDocuments: jest.fn(),
      exists: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationService,
        { provide: getModelToken(Organization.name), useValue: model },
      ],
    }).compile();

    service = module.get<OrganizationService>(OrganizationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('should return an organization by id', async () => {
      const result = await service.findOne(organization._id.toString());
      expect(model.findById).toHaveBeenCalled();
      expect(result).toEqual(organization);
    });

    it('should throw NotFoundException when missing', async () => {
      model.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      await expect(service.findOne('507f1f77bcf86cd799439011')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getSettings', () => {
    it('should return settings', async () => {
      await expect(
        service.getSettings(organization._id.toString()),
      ).resolves.toEqual({
        currency: 'XOF',
      });
    });
  });

  describe('addMember', () => {
    it('should add a new member', async () => {
      const newUserId = new Types.ObjectId();
      await service.addMember(
        organization._id.toString(),
        newUserId.toString(),
      );
      expect(model.findByIdAndUpdate).toHaveBeenCalled();
    });

    it('should throw ConflictException for duplicate member', async () => {
      await expect(
        service.addMember(organization._id.toString(), userId.toString()),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('removeMember', () => {
    it('should remove a member', async () => {
      await service.removeMember(
        organization._id.toString(),
        userId.toString(),
      );
      expect(model.findByIdAndUpdate).toHaveBeenCalled();
    });
  });

  describe('getStatistics', () => {
    it('should return member count', async () => {
      await expect(
        service.getStatistics(organization._id.toString()),
      ).resolves.toEqual(
        expect.objectContaining({ member_count: 1, status: 'active' }),
      );
    });
  });
});
