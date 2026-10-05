import { Test, TestingModule } from '@nestjs/testing';
import { ReservationController } from './reservation.controller';
import { ReservationService } from '../services/reservation.service';

describe('ReservationController', () => {
  let controller: ReservationController;
  let service: ReservationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReservationController],
      providers: [
        {
          provide: ReservationService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            findByConfirmationCode: jest.fn(),
            findByGuest: jest.fn(),
            confirm: jest.fn(),
            cancel: jest.fn(),
            checkIn: jest.fn(),
            checkOut: jest.fn(),
            markAsNoShow: jest.fn(),
            getUpcomingArrivals: jest.fn(),
            getDepartures: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ReservationController>(ReservationController);
    service = module.get<ReservationService>(ReservationService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate confirm to the service', () => {
    controller.confirm({ id: '507f1f77bcf86cd799439011' } as any);
    expect(service.confirm).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
  });
});
