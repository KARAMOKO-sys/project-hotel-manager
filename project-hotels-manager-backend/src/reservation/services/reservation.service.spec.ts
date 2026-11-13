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
    ModelMock.findOneAndUpdate = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        ...reservation,
        status: ReservationStatus.CHECKED_IN,
      }),
    });
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

  it('allows a confirmed reservation holder to check in during the stay', async () => {
    const startsAt = new Date(Date.now() - 86_400_000);
    const endsAt = new Date(Date.now() + 86_400_000);
    model.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        ...reservation,
        status: ReservationStatus.CONFIRMED,
        check_in: startsAt,
        check_out: endsAt,
      }),
    });

    const result = await service.selfCheckIn(
      reservation._id.toString(),
      reservation.guest_id.toString(),
    );

    expect(result.status).toBe(ReservationStatus.CHECKED_IN);
    expect(model.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        guest_id: reservation.guest_id,
        status: ReservationStatus.CONFIRMED,
      }),
      { $set: { status: ReservationStatus.CHECKED_IN } },
      { new: true },
    );
  });

  it('does not find a reservation that belongs to a different guest', async () => {
    model.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

    await expect(
      service.selfCheckIn(
        reservation._id.toString(),
        new Types.ObjectId().toString(),
      ),
    ).rejects.toThrow('Réservation introuvable');
    expect(model.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('rejects autonomous check-in before the arrival date', async () => {
    model.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        ...reservation,
        status: ReservationStatus.CONFIRMED,
        check_in: new Date(Date.now() + 86_400_000),
        check_out: new Date(Date.now() + 172_800_000),
      }),
    });

    await expect(
      service.selfCheckIn(
        reservation._id.toString(),
        reservation.guest_id.toString(),
      ),
    ).rejects.toThrow("Le check-in autonome n'est pas disponible");
    expect(model.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('allows the reservation holder to check out an active stay', async () => {
    model.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        ...reservation,
        status: ReservationStatus.CHECKED_IN,
      }),
    });
    model.findOneAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        ...reservation,
        status: ReservationStatus.CHECKED_OUT,
      }),
    });

    const result = await service.selfCheckOut(
      reservation._id.toString(),
      reservation.guest_id.toString(),
    );

    expect(result.status).toBe(ReservationStatus.CHECKED_OUT);
    expect(model.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        guest_id: reservation.guest_id,
        status: ReservationStatus.CHECKED_IN,
      }),
      { $set: { status: ReservationStatus.CHECKED_OUT } },
      { new: true },
    );
  });

  it('should list upcoming arrivals', async () => {
    const result = await service.getUpcomingArrivals(
      reservation.property_id.toString(),
      7,
    );
    expect(result).toEqual([reservation]);
  });
});
