import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { PropertyService } from './property.service';
import { Property } from '../schemas/property.entity';
import { Room } from '../../room/schemas/room.entity';
import { RoomType } from '../../room-type/schemas/room-type.entity';

describe('PropertyService', () => {
  let service: PropertyService;
  let propertyModel: any;
  let roomModel: any;
  let roomTypeModel: any;

  const property = {
    _id: new Types.ObjectId(),
    organization_id: new Types.ObjectId(),
    name: 'Hôtel du Lac',
    code: 'HDL',
    settings: { currency: 'XOF' },
  };

  beforeEach(async () => {
    propertyModel = {
      findById: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(property) }),
      findByIdAndUpdate: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(property) }),
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([property]),
      }),
      countDocuments: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(1) }),
    };
    roomModel = {
      find: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([{ number: '101' }]),
      }),
    };
    roomTypeModel = {
      find: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([{ name: 'Deluxe' }]),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PropertyService,
        { provide: getModelToken(Property.name), useValue: propertyModel },
        { provide: getModelToken(Room.name), useValue: roomModel },
        { provide: getModelToken(RoomType.name), useValue: roomTypeModel },
      ],
    }).compile();

    service = module.get<PropertyService>(PropertyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return settings', async () => {
    await expect(service.getSettings(property._id.toString())).resolves.toEqual(
      {
        currency: 'XOF',
      },
    );
  });

  it('should list rooms of a property', async () => {
    const rooms = await service.getRooms(property._id.toString());
    expect(roomModel.find).toHaveBeenCalled();
    expect(rooms).toEqual([{ number: '101' }]);
  });

  it('should list room types of a property', async () => {
    const roomTypes = await service.getRoomTypes(property._id.toString());
    expect(roomTypeModel.find).toHaveBeenCalled();
    expect(roomTypes).toEqual([{ name: 'Deluxe' }]);
  });

  it('should find properties by organization', async () => {
    const result = await service.findByOrganization(
      property.organization_id.toString(),
      { page: 1, limit: 10 } as any,
    );
    expect(result.data).toHaveLength(1);
  });
});
