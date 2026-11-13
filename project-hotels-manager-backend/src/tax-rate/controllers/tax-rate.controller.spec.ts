/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-floating-promises -- assertions sur les mocks jest du service */
import { Test, TestingModule } from '@nestjs/testing';
import { TaxRateController } from './tax-rate.controller';
import { TaxRateService } from '../services/tax-rate.service';
import { TaxAppliesTo } from '../schemas/tax-rate.entity';

describe('TaxRateController', () => {
  let controller: TaxRateController;
  let service: jest.Mocked<TaxRateService>;

  const id = '507f1f77bcf86cd799439011';
  const propertyId = '507f1f77bcf86cd799439012';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TaxRateController],
      providers: [
        {
          provide: TaxRateService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            findByProperty: jest.fn(),
            getApplicableTaxes: jest.fn(),
            calculateTaxes: jest.fn(),
            calculateTax: jest.fn(),
            activate: jest.fn(),
            deactivate: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<TaxRateController>(TaxRateController);
    service = module.get(TaxRateService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should map the body to calculateTaxes options', () => {
    controller.calculateTaxes(propertyId, {
      amount: 100000,
      nights: 2,
      guests: 3,
      date: '2026-12-01',
      applies_to: TaxAppliesTo.ROOM,
    });
    expect(service.calculateTaxes).toHaveBeenCalledWith(100000, propertyId, {
      nights: 2,
      guests: 3,
      date: new Date('2026-12-01'),
      appliesTo: TaxAppliesTo.ROOM,
    });
  });

  it('should delegate calculateTax for a single rate', () => {
    controller.calculateTax({ id }, { amount: 50 });
    expect(service.calculateTax).toHaveBeenCalledWith(id, 50, {
      nights: undefined,
      guests: undefined,
      date: undefined,
      appliesTo: undefined,
    });
  });

  it('should delegate getApplicableTaxes', () => {
    controller.getApplicableTaxes(propertyId, { date: '2026-12-01' });
    expect(service.getApplicableTaxes).toHaveBeenCalledWith(
      propertyId,
      new Date('2026-12-01'),
      undefined,
    );
  });
});
