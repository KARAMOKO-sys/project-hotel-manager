/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument -- mocks Mongoose typés `any` */
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { RatePlanService, StayContext } from './rate-plan.service';
import {
  CancellationPolicyType,
  MealPlan,
  RatePlan,
} from '../schemas/rate-plan.entity';
import { BookingChannel } from '../../base-entities/enums/booking-channel.enum';

const execOf = (value: unknown) => ({
  exec: jest.fn().mockResolvedValue(value),
});

describe('RatePlanService', () => {
  let service: RatePlanService;
  let model: any;
  let findChain: any;

  const propertyId = new Types.ObjectId();
  const roomTypeId = new Types.ObjectId();

  const makePlan = (overrides: Record<string, unknown> = {}): any => ({
    _id: new Types.ObjectId(),
    property_id: propertyId,
    room_type_ids: [],
    name: 'Flexible',
    code: 'FLEX',
    base_price: { amount: 50000, currency: 'XOF' },
    meal_plan: MealPlan.BREAKFAST,
    cancellation_policy: {
      type: CancellationPolicyType.MODERATE,
      free_cancellation_hours: 48,
      penalty_percent: 50,
    },
    min_stay: 1,
    arrival_days: [],
    channels: [],
    is_active: true,
    ...overrides,
  });

  let plan: any;

  beforeEach(async () => {
    plan = makePlan();
    const ModelMock: any = function (data: any) {
      const doc = { _id: new Types.ObjectId(), ...data };
      doc.save = jest.fn().mockResolvedValue(doc);
      return doc;
    };
    ModelMock.findById = jest.fn().mockImplementation(() => execOf(plan));
    ModelMock.findByIdAndUpdate = jest
      .fn()
      .mockImplementation((id: string, data: any) =>
        execOf({ ...plan, ...data }),
      );
    ModelMock.exists = jest.fn().mockResolvedValue(null);
    ModelMock.countDocuments = jest.fn().mockReturnValue(execOf(1));
    findChain = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([plan]),
    };
    ModelMock.find = jest.fn().mockReturnValue(findChain);
    model = ModelMock;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RatePlanService,
        { provide: getModelToken(RatePlan.name), useValue: model },
      ],
    }).compile();

    service = module.get<RatePlanService>(RatePlanService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const dto = () => ({
      property_id: propertyId.toString(),
      name: 'Non remboursable',
      code: ' nr ',
      base_price: { amount: 40000 },
    });

    it('should create a plan with an uppercase code and default policy', async () => {
      const result = await service.create(dto());
      expect(result.code).toBe('NR');
      expect(result.cancellation_policy).toEqual({
        type: CancellationPolicyType.FLEXIBLE,
        free_cancellation_hours: 24,
        penalty_percent: 100,
      });
    });

    it('should force 100% penalty for non refundable plans', async () => {
      const result = await service.create({
        ...dto(),
        cancellation_policy: {
          type: CancellationPolicyType.NON_REFUNDABLE,
          free_cancellation_hours: 72,
          penalty_percent: 10,
        },
      });
      expect(result.cancellation_policy.penalty_percent).toBe(100);
      expect(result.cancellation_policy.free_cancellation_hours).toBe(0);
    });

    it('should reject a duplicate code', async () => {
      model.exists.mockResolvedValue({ _id: new Types.ObjectId() });
      await expect(service.create(dto())).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('should reject max_stay < min_stay', async () => {
      await expect(
        service.create({ ...dto(), min_stay: 3, max_stay: 2 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should reject max_advance_days < min_advance_days', async () => {
      await expect(
        service.create({ ...dto(), min_advance_days: 30, max_advance_days: 7 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should reject a validity end before its start', async () => {
      await expect(
        service.create({
          ...dto(),
          valid_from: '2026-12-31',
          valid_to: '2026-12-01',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('update', () => {
    it('should validate merged constraints', async () => {
      plan = makePlan({ min_stay: 3 });
      await expect(
        service.update(plan._id.toString(), { max_stay: 2 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should check code uniqueness when the code changes', async () => {
      model.exists.mockResolvedValue({ _id: new Types.ObjectId() });
      await expect(
        service.update(plan._id.toString(), { code: 'other' }),
      ).rejects.toBeInstanceOf(ConflictException);
      const filter = model.exists.mock.calls[0][0];
      expect(filter._id).toEqual({ $ne: plan._id });
    });

    it('should not check uniqueness when the code is unchanged', async () => {
      const result = await service.update(plan._id.toString(), {
        code: 'flex',
        name: 'Flexible+',
      });
      expect(model.exists).not.toHaveBeenCalled();
      expect(result.name).toBe('Flexible+');
    });

    it('should throw NotFound for an unknown plan', async () => {
      model.findById.mockImplementation(() => execOf(null));
      await expect(
        service.update(new Types.ObjectId().toString(), {}),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  it('should activate and deactivate a plan', async () => {
    await expect(service.activate(plan._id.toString())).resolves.toMatchObject({
      is_active: true,
    });
    await expect(
      service.deactivate(plan._id.toString()),
    ).resolves.toMatchObject({ is_active: false });
  });

  describe('isApplicable', () => {
    const ctx = (overrides: Partial<StayContext> = {}): StayContext => ({
      checkIn: new Date('2026-11-06T00:00:00.000Z'), // vendredi
      checkOut: new Date('2026-11-09T00:00:00.000Z'), // 3 nuits
      bookingDate: new Date('2026-10-06T00:00:00.000Z'), // J-31
      ...overrides,
    });

    it('should accept a plan without restrictions', () => {
      expect(service.isApplicable(makePlan(), ctx())).toBe(true);
    });

    it('should reject an inactive plan', () => {
      expect(service.isApplicable(makePlan({ is_active: false }), ctx())).toBe(
        false,
      );
    });

    it('should enforce min / max stay', () => {
      expect(service.isApplicable(makePlan({ min_stay: 4 }), ctx())).toBe(
        false,
      );
      expect(service.isApplicable(makePlan({ max_stay: 2 }), ctx())).toBe(
        false,
      );
      expect(
        service.isApplicable(makePlan({ min_stay: 3, max_stay: 3 }), ctx()),
      ).toBe(true);
    });

    it('should require every night to be within validity', () => {
      const plan2 = makePlan({
        valid_from: new Date('2026-11-01'),
        valid_to: new Date('2026-11-07'),
      });
      expect(service.isApplicable(plan2, ctx())).toBe(false);
      expect(
        service.isApplicable(
          { ...plan2, valid_to: new Date('2026-11-08') },
          ctx(),
        ),
      ).toBe(true);
    });

    it('should enforce advance booking windows', () => {
      expect(
        service.isApplicable(makePlan({ min_advance_days: 45 }), ctx()),
      ).toBe(false);
      expect(
        service.isApplicable(makePlan({ max_advance_days: 7 }), ctx()),
      ).toBe(false);
    });

    it('should enforce arrival days, channels and room types', () => {
      expect(
        service.isApplicable(makePlan({ arrival_days: [1, 2] }), ctx()),
      ).toBe(false);
      expect(
        service.isApplicable(
          makePlan({ channels: [BookingChannel.WEBSITE] }),
          ctx({ channel: BookingChannel.OTA }),
        ),
      ).toBe(false);
      expect(
        service.isApplicable(
          makePlan({ room_type_ids: [new Types.ObjectId()] }),
          ctx({ roomTypeId: roomTypeId.toString() }),
        ),
      ).toBe(false);
      expect(
        service.isApplicable(
          makePlan({ room_type_ids: [roomTypeId] }),
          ctx({ roomTypeId: roomTypeId.toString() }),
        ),
      ).toBe(true);
    });
  });

  describe('findApplicable', () => {
    it('should return applicable plans sorted by price', async () => {
      findChain.exec.mockResolvedValue([
        plan,
        makePlan({ code: 'LONG', min_stay: 7 }),
      ]);
      const result = await service.findApplicable(
        propertyId.toString(),
        {
          check_in: '2026-11-06',
          check_out: '2026-11-09',
          room_type_id: roomTypeId.toString(),
        },
        new Date('2026-10-06'),
      );
      expect(result).toEqual([plan]);
      expect(findChain.sort).toHaveBeenCalledWith({ 'base_price.amount': 1 });
      expect(model.find.mock.calls[0][0].$or).toHaveLength(2);
    });

    it('should reject a check-out before check-in', async () => {
      await expect(
        service.findApplicable(propertyId.toString(), {
          check_in: '2026-11-09',
          check_out: '2026-11-06',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('calculateCancellationFee', () => {
    it('should be free before the free cancellation window', async () => {
      const result = await service.calculateCancellationFee(
        plan._id.toString(),
        100000,
        '2026-11-10T14:00:00.000Z',
        '2026-11-07T14:00:00.000Z',
      );
      expect(result.fee).toBe(0);
      expect(result.is_free_cancellation).toBe(true);
      expect(result.refund_amount).toBe(100000);
    });

    it('should apply the penalty inside the window', async () => {
      const result = await service.calculateCancellationFee(
        plan._id.toString(),
        100000,
        '2026-11-10T14:00:00.000Z',
        '2026-11-09T14:00:00.000Z',
      );
      expect(result.fee).toBe(50000);
      expect(result.hours_before_arrival).toBe(24);
    });

    it('should retain everything for a non refundable plan', async () => {
      plan = makePlan({
        cancellation_policy: { type: CancellationPolicyType.NON_REFUNDABLE },
      });
      const result = await service.calculateCancellationFee(
        plan._id.toString(),
        80000,
        '2026-12-10',
        '2026-10-01',
      );
      expect(result.fee).toBe(80000);
      expect(result.refund_amount).toBe(0);
    });

    it('should reject a negative amount', async () => {
      await expect(
        service.calculateCancellationFee(plan._id.toString(), -1, '2026-11-10'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should reject an invalid check-in date', async () => {
      await expect(
        service.calculateCancellationFee(plan._id.toString(), 10, 'nope'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  it('should list active plans of a property', async () => {
    const result = await service.findByProperty(
      propertyId.toString(),
      { page: 1, limit: 10 },
      true,
    );
    expect(result.data).toEqual([plan]);
    expect(model.find.mock.calls[0][0].is_active).toBe(true);
  });
});
