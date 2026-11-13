/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-floating-promises -- assertions sur les mocks jest du service */
import { Test, TestingModule } from '@nestjs/testing';
import { DynamicPricingRuleController } from './dynamic-pricing-rule.controller';
import { DynamicPricingRuleService } from '../services/dynamic-pricing-rule.service';

describe('DynamicPricingRuleController', () => {
  let controller: DynamicPricingRuleController;
  let service: jest.Mocked<DynamicPricingRuleService>;

  const id = '507f1f77bcf86cd799439011';
  const propertyId = '507f1f77bcf86cd799439012';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DynamicPricingRuleController],
      providers: [
        {
          provide: DynamicPricingRuleService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            findByProperty: jest.fn(),
            findActiveRules: jest.fn(),
            calculateAdjustedPrice: jest.fn(),
            validateRule: jest.fn(),
            activate: jest.fn(),
            deactivate: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<DynamicPricingRuleController>(
      DynamicPricingRuleController,
    );
    service = module.get(DynamicPricingRuleService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate calculateAdjustedPrice', () => {
    const dto = { base_price: 100, date: '2026-12-24' };
    controller.calculateAdjustedPrice(propertyId, dto);
    expect(service.calculateAdjustedPrice).toHaveBeenCalledWith(
      propertyId,
      dto,
    );
  });

  it('should delegate validateRule with the validator id', () => {
    controller.validateRule({ id }, { validated_by: propertyId });
    expect(service.validateRule).toHaveBeenCalledWith(id, propertyId);
  });

  it('should delegate activate / deactivate', () => {
    controller.activate({ id });
    controller.deactivate({ id });
    expect(service.activate).toHaveBeenCalledWith(id);
    expect(service.deactivate).toHaveBeenCalledWith(id);
  });
});
