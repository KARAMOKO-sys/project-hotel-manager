import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { ReservationService } from './reservation.service';
import { Reservation, ReservationStatus } from '../schemas/reservation.entity';

describe('ReservationService', () => {
  let service: ReservationService;
  let model: any;

  const reservation = {
    _id: new Types.ObjectId(),
    property_id: new Types.ObjectId(),
    guest_id: new Types.ObjectId(),
    confirmation_code: 'RSV-ABC123',
    status: ReservationStatus.PENDING,
    save: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const ModelMock: any = function (data: any) {
      const doc = { ...reservation, ...data };
      doc.save = jest.fn().mockResolvedValue(doc);
      return doc;
    };
    ModelMock.findById = jest
      .fn()
      .mockReturnValue({ exec: jest.fn().mockResolvedValue(reservation) });
    ModelMock.findByIdAndUpdate = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        ...reservation,
        status: ReservationStatus.CONFIRMED,
      }),
    });
    ModelMock.findOne = jest
      .fn()
      .mockReturnValue({ exec: jest.fn().mockResolvedValue(reservation) });
    ModelMock.find = jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([reservation]),
    });
    ModelMock.countDocuments = jest
      .fn()
      .mockReturnValue({ exec: jest.fn().mockResolvedValue(1) });

    model = ModelMock;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationService,
        { provide: getModelToken(Reservation.name), useValue: model },
      ],
    }).compile();

    service = module.get<ReservationService>(ReservationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a reservation with a confirmation code', async () => {
    const result = await service.create({
      property_id: '507f1f77bcf86cd799439011',
      guest_id: '507f1f77bcf86cd799439012',
      room_type_id: '507f1f77bcf86cd799439013',
      check_in: '2026-10-01',
      check_out: '2026-10-03',
    } as any);
    expect(result.confirmation_code).toMatch(/^RSV-/);
  });

  it('should find by confirmation code', async () => {
    await expect(service.findByConfirmationCode('rsv-abc123')).resolves.toEqual(
      reservation,
    );
  });

  it('should confirm a reservation', async () => {
    const result = await service.confirm(reservation._id.toString());
    expect(result.status).toBe(ReservationStatus.CONFIRMED);
  });

  it('should cancel a reservation with a reason', async () => {
    model.findByIdAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        ...reservation,
        status: ReservationStatus.CANCELLED,
        cancellation_reason: 'Client request',
      }),
    });
    const result = await service.cancel(
      reservation._id.toString(),
      'Client request',
    );
    expect(result.status).toBe(ReservationStatus.CANCELLED);
  });

  it('should list upcoming arrivals', async () => {
    const result = await service.getUpcomingArrivals(
      reservation.property_id.toString(),
      7,
    );
    expect(result).toEqual([reservation]);
  });
});
