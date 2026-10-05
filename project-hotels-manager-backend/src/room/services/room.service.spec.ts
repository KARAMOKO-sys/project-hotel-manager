import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { RoomService } from './room.service';
import { Room } from '../schemas/room.entity';
import { RoomStatus } from '../../base-entities/enums/room-status.enum';

describe('RoomService', () => {
  let service: RoomService;
  let model: any;

  const room = {
    _id: new Types.ObjectId(),
    property_id: new Types.ObjectId(),
    room_type_id: new Types.ObjectId(),
    number: '101',
    status: RoomStatus.CLEAN,
  };

  beforeEach(async () => {
    model = {
      findById: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(room) }),
      findByIdAndUpdate: jest.fn().mockReturnValue({
        exec: jest
          .fn()
          .mockResolvedValue({ ...room, status: RoomStatus.MAINTENANCE }),
      }),
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([room]),
      }),
      countDocuments: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(1) }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomService,
        { provide: getModelToken(Room.name), useValue: model },
      ],
    }).compile();

    service = module.get<RoomService>(RoomService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should update room status', async () => {
    const result = await service.updateStatus(
      room._id.toString(),
      RoomStatus.MAINTENANCE,
    );
    expect(result.status).toBe(RoomStatus.MAINTENANCE);
  });

  it('should block a room', async () => {
    model.findByIdAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        ...room,
        status: RoomStatus.BLOCKED,
        notes: 'Renovation',
      }),
    });
    const result = await service.blockRoom(room._id.toString(), 'Renovation');
    expect(result.status).toBe(RoomStatus.BLOCKED);
  });

  it('should list maintenance rooms', async () => {
    await service.getMaintenanceRooms(room.property_id.toString());
    expect(model.find).toHaveBeenCalled();
  });

  it('should list available rooms', async () => {
    await service.getAvailableRooms(room.property_id.toString());
    expect(model.find).toHaveBeenCalled();
  });
});
