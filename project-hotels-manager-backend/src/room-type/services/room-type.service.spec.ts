import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { RoomTypeService } from './room-type.service';
import { RoomType } from '../schemas/room-type.entity';
import { Room } from '../../room/schemas/room.entity';

describe('RoomTypeService', () => {
  let service: RoomTypeService;
  let model: any;
  let roomModel: any;

  const roomType = {
    _id: new Types.ObjectId(),
    property_id: new Types.ObjectId(),
    name: 'Deluxe',
    code: 'DLX',
    base_price: { amount: 100, currency: 'XOF' },
    save: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    model = {
      findById: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(roomType) }),
      findByIdAndUpdate: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(roomType) }),
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([roomType]),
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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomTypeService,
        { provide: getModelToken(RoomType.name), useValue: model },
        { provide: getModelToken(Room.name), useValue: roomModel },
      ],
    }).compile();

    service = module.get<RoomTypeService>(RoomTypeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should update base price', async () => {
    await service.updateBasePrice(roomType._id.toString(), 150, 'EUR');
    expect(roomType.base_price.amount).toBe(150);
    expect(roomType.base_price.currency).toBe('EUR');
    expect(roomType.save).toHaveBeenCalled();
  });

  it('should list rooms of a room type', async () => {
    const rooms = await service.getRooms(roomType._id.toString());
    expect(roomModel.find).toHaveBeenCalled();
    expect(rooms).toEqual([{ number: '101' }]);
  });

  it('should find room types by property', async () => {
    const result = await service.findByProperty(
      roomType.property_id.toString(),
      {
        page: 1,
        limit: 10,
      } as any,
    );
    expect(result.data).toHaveLength(1);
  });
});
