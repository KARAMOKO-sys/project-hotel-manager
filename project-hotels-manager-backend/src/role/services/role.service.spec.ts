import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { RoleService } from './role.service';
import { Role } from '../schemas/role.schema';

describe('RoleService', () => {
  let service: RoleService;
  let model: any;

  const role = {
    _id: new Types.ObjectId(),
    name: 'Manager',
    code: 'manager',
    permissions: ['properties:read'],
    hasPermission: (p: string) => ['properties:read', '*'].includes(p),
    save: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const ModelMock: any = function (data: any) {
      const doc = { ...role, ...data };
      doc.save = jest.fn().mockResolvedValue(doc);
      return doc;
    };
    ModelMock.findOne = jest.fn().mockResolvedValue(null);
    ModelMock.findById = jest
      .fn()
      .mockReturnValue({ exec: jest.fn().mockResolvedValue(role) });
    ModelMock.findByIdAndUpdate = jest
      .fn()
      .mockReturnValue({ exec: jest.fn().mockResolvedValue(role) });
    ModelMock.findByIdAndDelete = jest
      .fn()
      .mockReturnValue({ exec: jest.fn().mockResolvedValue(role) });
    ModelMock.find = jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([role]),
    });
    ModelMock.aggregate = jest
      .fn()
      .mockResolvedValue([{ total: [{ count: 1 }] }]);

    model = ModelMock;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoleService,
        { provide: getModelToken(Role.name), useValue: model },
      ],
    }).compile();

    service = module.get<RoleService>(RoleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a role', async () => {
    const result = await service.create({
      name: 'Manager',
      code: 'manager',
    } as any);
    expect(result.name).toBe('Manager');
  });

  it('should reject duplicate role', async () => {
    model.findOne.mockResolvedValue(role);
    await expect(
      service.create({ name: 'Manager', code: 'manager' } as any),
    ).rejects.toThrow(ConflictException);
  });

  it('should find a role by id', async () => {
    await expect(service.findOne(role._id.toString())).resolves.toEqual(role);
  });

  it('should add a permission', async () => {
    role.permissions = ['properties:read'];
    await service.addPermission(role._id.toString(), 'properties:write');
    expect(role.permissions).toContain('properties:write');
  });

  it('should check permissions', async () => {
    const result = await service.checkPermissions(role._id.toString(), [
      'properties:read',
      'properties:write',
    ]);
    expect(result.has_all).toBe(false);
    expect(result.granted).toContain('properties:read');
    expect(result.missing).toContain('properties:write');
  });

  it('should remove a role', async () => {
    await expect(service.remove(role._id.toString())).resolves.toEqual(role);
    expect(model.findByIdAndDelete).toHaveBeenCalled();
  });
});
