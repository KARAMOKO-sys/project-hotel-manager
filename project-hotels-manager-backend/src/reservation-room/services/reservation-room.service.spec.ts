import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { ReservationRoomService } from './reservation-room.service';
import { ReservationRoom } from '../schemas/reservation-room.entity';

describe('ReservationRoomService', () => {
  let service: ReservationRoomService;
  let model: any;

  const link = {
    _id: new Types.ObjectId(),
    reservation_id: new Types.ObjectId(),
    room_id: new Types.ObjectId(),
  };

  beforeEach(async () => {
    model = {
      findById: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(link) }),
      findByIdAndUpdate: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(link) }),
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([link]),
      }),
      countDocuments: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(1) }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationRoomService,
        { provide: getModelToken(ReservationRoom.name), useValue: model },
      ],
    }).compile();

    service = module.get<ReservationRoomService>(ReservationRoomService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should list links by reservation', async () => {
    const result = await service.findByReservation(
      link.reservation_id.toString(),
      { page: 1, limit: 10 } as any,
    );
    expect(result.data).toEqual([link]);
  });
});
