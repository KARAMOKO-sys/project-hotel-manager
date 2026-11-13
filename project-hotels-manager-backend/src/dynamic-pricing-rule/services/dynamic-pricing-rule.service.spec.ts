/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument -- mocks Mongoose typés `any` */
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import {
  DynamicPricingRuleService,
  PricingContext,
} from './dynamic-pricing-rule.service';
import {
  DynamicPricingRule,
  PricingRuleType,
} from '../schemas/dynamic-pricing-rule.entity';

const execOf = (value: unknown) => ({
  exec: jest.fn().mockResolvedValue(value),
});

describe('DynamicPricingRuleService', () => {
  let service: DynamicPricingRuleService;
  let model: any;
  let findChain: any;

  const propertyId = new Types.ObjectId();
  const roomTypeId = new Types.ObjectId();

  const makeRule = (overrides: Record<string, unknown> = {}): any => ({
    _id: new Types.ObjectId(),
    property_id: propertyId,
    room_type_ids: [],
    name: 'Haute saison',
    rule_type: PricingRuleType.SEASONALITY,
    adjustment_percent: 20,
    start_date: new Date('2026-12-15T00:00:00.000Z'),
    end_date: new Date('2027-01-05T00:00:00.000Z'),
    days_of_week: [],
    priority: 0,
    is_active: true,
    requires_validation: false,
    ...overrides,
  });

  let rule: any;

  beforeEach(async () => {
    rule = makeRule();
    const ModelMock: any = function (data: any) {
      const doc = { _id: new Types.ObjectId(), ...data };
      doc.save = jest.fn().mockResolvedValue(doc);
      return doc;
    };
    ModelMock.findById = jest.fn().mockImplementation(() => execOf(rule));
    ModelMock.findByIdAndUpdate = jest
      .fn()
      .mockImplementation((id: string, data: any) =>
        execOf({ ...rule, ...data }),
      );
    ModelMock.countDocuments = jest.fn().mockReturnValue(execOf(1));
    findChain = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([rule]),
    };
    ModelMock.find = jest.fn().mockReturnValue(findChain);
    model = ModelMock;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DynamicPricingRuleService,
        { provide: getModelToken(DynamicPricingRule.name), useValue: model },
      ],
    }).compile();

    service = module.get<DynamicPricingRuleService>(DynamicPricingRuleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const seasonal = (adjustment: number) => ({
      property_id: propertyId.toString(),
      name: 'Noël',
      rule_type: PricingRuleType.SEASONALITY,
      adjustment_percent: adjustment,
      start_date: '2026-12-20',
      end_date: '2026-12-31',
    });

    it('should create an active rule under the validation threshold', async () => {
      const result = await service.create(seasonal(15));
      expect(result.requires_validation).toBe(false);
      expect(result.is_active).toBe(true);
    });

    it('should create an inactive rule requiring validation above 25%', async () => {
      const result = await service.create({ ...seasonal(30), is_active: true });
      expect(result.requires_validation).toBe(true);
      expect(result.is_active).toBe(false);
    });

    it('should reject an adjustment outside -20%..+50%', async () => {
      await expect(service.create(seasonal(60))).rejects.toBeInstanceOf(
        BadRequestException,
      );
      await expect(service.create(seasonal(-25))).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('should reject a season without dates', async () => {
      await expect(
        service.create({ ...seasonal(10), start_date: undefined }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should reject an end date before the start date', async () => {
      await expect(
        service.create({ ...seasonal(10), end_date: '2026-12-01' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should require days_before_arrival for last-minute rules', async () => {
      await expect(
        service.create({
          property_id: propertyId.toString(),
          name: 'Last minute',
          rule_type: PricingRuleType.LAST_MINUTE,
          adjustment_percent: -10,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should require occupancy_threshold for occupancy rules', async () => {
      await expect(
        service.create({
          property_id: propertyId.toString(),
          name: 'Forte occupation',
          rule_type: PricingRuleType.OCCUPANCY_THRESHOLD,
          adjustment_percent: 10,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('update', () => {
    it('should reset validation and deactivate when raising above 25%', async () => {
      rule = makeRule({
        requires_validation: true,
        validated_at: new Date(),
        adjustment_percent: 30,
      });
      const result = await service.update(rule._id.toString(), {
        adjustment_percent: 40,
      });
      expect(result.requires_validation).toBe(true);
      expect(result.validated_at).toBeNull();
      expect(result.is_active).toBe(false);
    });

    it('should clear the validation flag when lowering below 25%', async () => {
      rule = makeRule({ requires_validation: true, adjustment_percent: 30 });
      const result = await service.update(rule._id.toString(), {
        adjustment_percent: 10,
      });
      expect(result.requires_validation).toBe(false);
    });

    it('should refuse activation of an unvalidated high variation', async () => {
      rule = makeRule({
        requires_validation: true,
        adjustment_percent: 30,
        is_active: false,
      });
      await expect(
        service.update(rule._id.toString(), { is_active: true }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should validate the merged definition', async () => {
      await expect(
        service.update(rule._id.toString(), { end_date: '2026-01-01' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should throw NotFound for an unknown rule', async () => {
      model.findById.mockImplementation(() => execOf(null));
      await expect(
        service.update(new Types.ObjectId().toString(), {}),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('validateRule / activate', () => {
    it('should validate a rule requiring validation', async () => {
      rule = makeRule({ requires_validation: true, adjustment_percent: 40 });
      const userId = new Types.ObjectId();
      const result = await service.validateRule(
        rule._id.toString(),
        userId.toString(),
      );
      expect(result.validated_at).toBeInstanceOf(Date);
      expect(result.validated_by).toEqual(userId);
    });

    it('should reject validating a rule that does not need it', async () => {
      await expect(
        service.validateRule(rule._id.toString()),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should refuse to activate an unvalidated rule', async () => {
      rule = makeRule({ requires_validation: true, is_active: false });
      await expect(
        service.activate(rule._id.toString()),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should activate a validated rule and deactivate it', async () => {
      rule = makeRule({
        requires_validation: true,
        validated_at: new Date(),
        is_active: false,
      });
      await expect(
        service.activate(rule._id.toString()),
      ).resolves.toMatchObject({ is_active: true });
      await expect(
        service.deactivate(rule._id.toString()),
      ).resolves.toMatchObject({ is_active: false });
    });
  });

  describe('applyRules (pure)', () => {
    const ctx = (overrides: Partial<PricingContext> = {}): PricingContext => ({
      date: new Date('2026-12-24T00:00:00.000Z'), // jeudi
      bookingDate: new Date('2026-12-22T10:00:00.000Z'),
      occupancyRate: 85,
      ...overrides,
    });

    it('should return the base price when no rule matches', () => {
      const result = service.applyRules(
        100,
        ctx({ date: new Date('2026-06-01') }),
        [rule],
      );
      expect(result.adjusted_price).toBe(100);
      expect(result.applied_rules).toEqual([]);
    });

    it('should apply a seasonal rule', () => {
      const result = service.applyRules(100, ctx(), [rule]);
      expect(result.adjusted_price).toBe(120);
      expect(result.total_adjustment_percent).toBe(20);
      expect(result.requires_validation).toBe(false);
    });

    it('should cumulate matching rules and flag variations above 25%', () => {
      const result = service.applyRules(100, ctx(), [
        rule,
        makeRule({
          name: 'Occupation',
          rule_type: PricingRuleType.OCCUPANCY_THRESHOLD,
          occupancy_threshold: 80,
          adjustment_percent: 10,
          priority: 5,
        }),
      ]);
      expect(result.total_adjustment_percent).toBe(30);
      expect(result.adjusted_price).toBe(130);
      expect(result.requires_validation).toBe(true);
      expect(result.applied_rules[0].name).toBe('Occupation');
    });

    it('should clamp the cumulated adjustment to +50%', () => {
      const result = service.applyRules(200, ctx(), [
        makeRule({ adjustment_percent: 40 }),
        makeRule({ rule_type: PricingRuleType.EVENT, adjustment_percent: 30 }),
      ]);
      expect(result.raw_adjustment_percent).toBe(70);
      expect(result.total_adjustment_percent).toBe(50);
      expect(result.was_clamped).toBe(true);
      expect(result.adjusted_price).toBe(300);
    });

    it('should clamp the cumulated adjustment to -20%', () => {
      const result = service.applyRules(100, ctx(), [
        makeRule({ adjustment_percent: -15 }),
        makeRule({
          rule_type: PricingRuleType.LAST_MINUTE,
          days_before_arrival: 3,
          adjustment_percent: -15,
        }),
      ]);
      expect(result.total_adjustment_percent).toBe(-20);
      expect(result.adjusted_price).toBe(80);
    });

    it('should apply last-minute rules only within the lead time', () => {
      const lastMinute = makeRule({
        rule_type: PricingRuleType.LAST_MINUTE,
        days_before_arrival: 1,
        adjustment_percent: -10,
      });
      expect(service.applyRules(100, ctx(), [lastMinute]).adjusted_price).toBe(
        100,
      );
      expect(
        service.applyRules(
          100,
          ctx({ bookingDate: new Date('2026-12-23T20:00:00.000Z') }),
          [lastMinute],
        ).adjusted_price,
      ).toBe(90);
    });

    it('should ignore occupancy rules without an occupancy rate', () => {
      const occ = makeRule({
        rule_type: PricingRuleType.OCCUPANCY_THRESHOLD,
        occupancy_threshold: 80,
      });
      expect(
        service.applyRules(100, ctx({ occupancyRate: undefined }), [occ])
          .applied_rules,
      ).toHaveLength(0);
    });

    it('should ignore inactive, unvalidated, wrong day or wrong room type rules', () => {
      const result = service.applyRules(
        100,
        ctx({ roomTypeId: roomTypeId.toString() }),
        [
          makeRule({ is_active: false }),
          makeRule({ requires_validation: true, adjustment_percent: 40 }),
          makeRule({ days_of_week: [0, 6] }),
          makeRule({ room_type_ids: [new Types.ObjectId()] }),
        ],
      );
      expect(result.applied_rules).toHaveLength(0);
    });

    it('should reject a negative base price', () => {
      expect(() => service.applyRules(-1, ctx(), [])).toThrow(
        BadRequestException,
      );
    });
  });

  describe('calculateAdjustedPrice', () => {
    it('should load active rules and apply them', async () => {
      const result = await service.calculateAdjustedPrice(
        propertyId.toString(),
        {
          base_price: 50000,
          date: '2026-12-24',
          room_type_id: roomTypeId.toString(),
        },
      );
      expect(result.adjusted_price).toBe(60000);
      const filter = model.find.mock.calls[0][0];
      expect(filter.is_active).toBe(true);
      expect(filter.$or).toHaveLength(2);
      expect(findChain.sort).toHaveBeenCalledWith({ priority: -1 });
    });

    it('should reject an invalid date', async () => {
      await expect(
        service.calculateAdjustedPrice(propertyId.toString(), {
          base_price: 1,
          date: 'nope',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should reject an invalid property id', async () => {
      await expect(
        service.calculateAdjustedPrice('bad', {
          base_price: 1,
          date: '2026-12-24',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
