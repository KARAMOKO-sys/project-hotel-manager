import { Test, TestingModule } from '@nestjs/testing';
import { ReservationRoomController } from './reservation-room.controller';
import { ReservationRoomService } from '../services/reservation-room.service';

describe('ReservationRoomController', () => {
  let controller: ReservationRoomController;
  let service: ReservationRoomService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReservationRoomController],
      providers: [
        {
          provide: ReservationRoomService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            findByReservation: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ReservationRoomController>(
      ReservationRoomController,
    );
    service = module.get<ReservationRoomService>(ReservationRoomService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate create to the service', () => {
    const dto = {
      reservation_id: '507f1f77bcf86cd799439011',
      room_id: '507f1f77bcf86cd799439012',
    };
    controller.create(dto as any);
    expect(service.create).toHaveBeenCalledWith(dto);
  });
});
