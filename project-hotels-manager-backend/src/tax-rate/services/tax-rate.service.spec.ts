/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument -- mocks Mongoose typés `any` */
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { TaxRateService } from './tax-rate.service';
import {
  TaxAppliesTo,
  TaxCalculationType,
  TaxFixedBasis,
  TaxRate,
  TaxType,
} from '../schemas/tax-rate.entity';

const execOf = (value: unknown) => ({
  exec: jest.fn().mockResolvedValue(value),
});

describe('TaxRateService', () => {
  let service: TaxRateService;
  let model: any;
  let findChain: any;

  const propertyId = new Types.ObjectId();

  const makeTax = (overrides: Record<string, unknown> = {}): any => ({
    _id: new Types.ObjectId(),
    property_id: propertyId,
    name: 'TVA',
    code: 'VAT18',
    tax_type: TaxType.VAT,
    calculation_type: TaxCalculationType.PERCENTAGE,
    rate: 18,
    fixed_basis: TaxFixedBasis.PER_STAY,
    applies_to: TaxAppliesTo.ALL,
    is_inclusive: false,
    is_active: true,
    priority: 0,
    ...overrides,
  });

  const touristTax = () =>
    makeTax({
      name: 'Taxe de séjour',
      code: 'TS',
      tax_type: TaxType.TOURIST_TAX,
      calculation_type: TaxCalculationType.FIXED,
      rate: 1000,
      fixed_basis: TaxFixedBasis.PER_PERSON_PER_NIGHT,
      applies_to: TaxAppliesTo.ROOM,
    });

  let tax: any;

  beforeEach(async () => {
    tax = makeTax();
    const ModelMock: any = function (data: any) {
      const doc = { _id: new Types.ObjectId(), ...data };
      doc.save = jest.fn().mockResolvedValue(doc);
      return doc;
    };
    ModelMock.findById = jest.fn().mockImplementation(() => execOf(tax));
    ModelMock.findByIdAndUpdate = jest
      .fn()
      .mockImplementation((id: string, data: any) =>
        execOf({ ...tax, ...data }),
      );
    ModelMock.exists = jest.fn().mockResolvedValue(null);
    ModelMock.countDocuments = jest.fn().mockReturnValue(execOf(1));
    findChain = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([tax]),
    };
    ModelMock.find = jest.fn().mockReturnValue(findChain);
    model = ModelMock;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaxRateService,
        { provide: getModelToken(TaxRate.name), useValue: model },
      ],
    }).compile();

    service = module.get<TaxRateService>(TaxRateService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const dto = () => ({
      property_id: propertyId.toString(),
      name: 'TVA',
      code: 'vat18',
      rate: 18,
    });

    it('should create a tax rate with an uppercase code', async () => {
      const result = await service.create(dto());
      expect(result.code).toBe('VAT18');
    });

    it('should reject a percentage above 100', async () => {
      await expect(
        service.create({ ...dto(), rate: 120 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should accept a fixed amount above 100', async () => {
      await expect(
        service.create({
          ...dto(),
          calculation_type: TaxCalculationType.FIXED,
          rate: 1500,
        }),
      ).resolves.toBeDefined();
    });

    it('should reject a validity end before its start', async () => {
      await expect(
        service.create({
          ...dto(),
          valid_from: '2027-01-01',
          valid_to: '2026-01-01',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should reject a duplicate code', async () => {
      model.exists.mockResolvedValue({ _id: new Types.ObjectId() });
      await expect(service.create(dto())).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('update', () => {
    it('should validate the merged rate against the existing type', async () => {
      await expect(
        service.update(tax._id.toString(), { rate: 150 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should check uniqueness when the code changes', async () => {
      model.exists.mockResolvedValue({ _id: new Types.ObjectId() });
      await expect(
        service.update(tax._id.toString(), { code: 'other' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('should update a tax rate', async () => {
      const result = await service.update(tax._id.toString(), { rate: 20 });
      expect(result.rate).toBe(20);
    });

    it('should throw NotFound for an unknown tax rate', async () => {
      model.findById.mockImplementation(() => execOf(null));
      await expect(
        service.update(new Types.ObjectId().toString(), {}),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  it('should activate and deactivate', async () => {
    await expect(service.activate(tax._id.toString())).resolves.toMatchObject({
      is_active: true,
    });
    await expect(service.deactivate(tax._id.toString())).resolves.toMatchObject(
      { is_active: false },
    );
  });

  describe('getApplicableTaxes', () => {
    it('should filter by validity and category', async () => {
      const date = new Date('2026-12-01');
      const result = await service.getApplicableTaxes(
        propertyId.toString(),
        date,
        TaxAppliesTo.ROOM,
      );
      expect(result).toEqual([tax]);
      const filter = model.find.mock.calls[0][0];
      expect(filter.applies_to).toEqual({
        $in: [TaxAppliesTo.ALL, TaxAppliesTo.ROOM],
      });
      expect(filter.$and[0].$or[1]).toEqual({ valid_from: { $lte: date } });
      expect(findChain.sort).toHaveBeenCalledWith({
        priority: 1,
        created_at: 1,
      });
    });

    it('should reject an invalid date', async () => {
      await expect(
        service.getApplicableTaxes(propertyId.toString(), new Date('nope')),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should reject an invalid property id', async () => {
      await expect(service.getApplicableTaxes('bad')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe('computeTaxes (pure)', () => {
    it('should add exclusive VAT and per-person-per-night tourist tax', () => {
      const result = service.computeTaxes(100000, [tax, touristTax()], {
        nights: 2,
        guests: 2,
      });
      expect(result.taxes.map((t) => t.amount)).toEqual([18000, 4000]);
      expect(result.total_exclusive_tax).toBe(22000);
      expect(result.total_inclusive_tax).toBe(0);
      expect(result.net_amount).toBe(100000);
      expect(result.total_amount).toBe(122000);
    });

    it('should extract inclusive VAT from the amount', () => {
      const result = service.computeTaxes(118000, [
        makeTax({ is_inclusive: true }),
      ]);
      expect(result.taxes[0].amount).toBe(18000);
      expect(result.net_amount).toBe(100000);
      expect(result.total_amount).toBe(118000);
    });

    it('should compute exclusive taxes on the net of inclusive ones', () => {
      const result = service.computeTaxes(118000, [
        makeTax({ is_inclusive: true }),
        makeTax({ code: 'SC', tax_type: TaxType.SERVICE_CHARGE, rate: 10 }),
      ]);
      expect(result.taxes[1].amount).toBe(10000);
      expect(result.total_amount).toBe(128000);
    });

    it('should apply fixed bases (per stay / night / person)', () => {
      const fixed = (basis: TaxFixedBasis) =>
        makeTax({
          calculation_type: TaxCalculationType.FIXED,
          rate: 500,
          fixed_basis: basis,
        });
      const result = service.computeTaxes(
        10000,
        [
          fixed(TaxFixedBasis.PER_STAY),
          fixed(TaxFixedBasis.PER_NIGHT),
          fixed(TaxFixedBasis.PER_PERSON),
        ],
        { nights: 3, guests: 2 },
      );
      expect(result.taxes.map((t) => t.amount)).toEqual([500, 1500, 1000]);
    });

    it('should reject inclusive fixed taxes greater than the amount', () => {
      expect(() =>
        service.computeTaxes(100, [
          makeTax({
            calculation_type: TaxCalculationType.FIXED,
            rate: 500,
            is_inclusive: true,
          }),
        ]),
      ).toThrow(BadRequestException);
    });

    it('should reject a negative amount', () => {
      expect(() => service.computeTaxes(-5, [tax])).toThrow(
        BadRequestException,
      );
    });
  });

  describe('calculateTaxes', () => {
    it('should compute taxes from the applicable rates of a property', async () => {
      findChain.exec.mockResolvedValue([tax, touristTax()]);
      const result = await service.calculateTaxes(
        50000,
        propertyId.toString(),
        {
          nights: 1,
          guests: 1,
          appliesTo: TaxAppliesTo.ROOM,
        },
      );
      expect(result.total_tax).toBe(10000);
      expect(result.total_amount).toBe(60000);
    });

    it('should return no tax when none applies', async () => {
      findChain.exec.mockResolvedValue([]);
      const result = await service.calculateTaxes(50000, propertyId.toString());
      expect(result.total_tax).toBe(0);
      expect(result.total_amount).toBe(50000);
    });

    it('should reject a negative amount before querying', async () => {
      await expect(
        service.calculateTaxes(-1, propertyId.toString()),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(model.find).not.toHaveBeenCalled();
    });
  });

  describe('calculateTax', () => {
    it('should compute a single tax rate', async () => {
      const result = await service.calculateTax(tax._id.toString(), 1000);
      expect(result.total_tax).toBe(180);
    });

    it('should reject an inactive tax rate', async () => {
      tax = makeTax({ is_active: false });
      await expect(
        service.calculateTax(tax._id.toString(), 1000),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should throw NotFound for an unknown tax rate', async () => {
      model.findById.mockImplementation(() => execOf(null));
      await expect(
        service.calculateTax(new Types.ObjectId().toString(), 1000),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
