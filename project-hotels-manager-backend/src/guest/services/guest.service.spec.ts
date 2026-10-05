import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { NotFoundException } from '@nestjs/common';
import { GuestService } from './guest.service';
import { Guest } from '../schemas/guest.entity';

describe('GuestService', () => {
  let service: GuestService;
  let model: any;

  const guest = {
    _id: new Types.ObjectId(),
    email: 'guest@example.com',
    first_name: 'John',
    last_name: 'Doe',
    is_active: true,
    loyalty_points: 100,
    loyalty_transactions: [],
    addLoyaltyPoints: jest.fn(),
    redeemLoyaltyPoints: jest.fn().mockReturnValue(true),
    getLoyaltyHistory: jest.fn().mockReturnValue([]),
    setPassword: jest.fn().mockResolvedValue(undefined),
    save: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const ModelMock: any = function (data: any) {
      const doc = { ...guest, ...data };
      doc.save = jest.fn().mockResolvedValue(doc);
      return doc;
    };
    ModelMock.findById = jest
      .fn()
      .mockReturnValue({ exec: jest.fn().mockResolvedValue(guest) });
    ModelMock.findByIdAndUpdate = jest
      .fn()
      .mockReturnValue({ exec: jest.fn().mockResolvedValue(guest) });
    ModelMock.findOne = jest
      .fn()
      .mockReturnValue({ exec: jest.fn().mockResolvedValue(guest) });
    ModelMock.find = jest
      .fn()
      .mockReturnValue({ exec: jest.fn().mockResolvedValue([guest]) });
    ModelMock.countDocuments = jest
      .fn()
      .mockReturnValue({ exec: jest.fn().mockResolvedValue(1) });

    model = ModelMock;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GuestService,
        { provide: getModelToken(Guest.name), useValue: model },
      ],
    }).compile();

    service = module.get<GuestService>(GuestService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a guest with a hashed password', async () => {
    const result = await service.create({
      email: 'new@example.com',
      password: 'secret123',
    } as any);
    expect(result.email).toBe('new@example.com');
    expect(guest.setPassword).toHaveBeenCalledWith('secret123');
  });

  it('should find a guest by email', async () => {
    await expect(service.findByEmail('guest@example.com')).resolves.toEqual(
      guest,
    );
  });

  it('should throw when email not found', async () => {
    model.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
    await expect(service.findByEmail('unknown@example.com')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should activate a guest', async () => {
    await service.activate(guest._id.toString());
    expect(model.findByIdAndUpdate).toHaveBeenCalled();
  });

  it('should add loyalty points', async () => {
    await service.addLoyaltyPoints(guest._id.toString(), 50);
    expect(guest.addLoyaltyPoints).toHaveBeenCalledWith(50);
  });

  it('should search guests', async () => {
    const result = await service.search('John');
    expect(result).toEqual([guest]);
  });
});
