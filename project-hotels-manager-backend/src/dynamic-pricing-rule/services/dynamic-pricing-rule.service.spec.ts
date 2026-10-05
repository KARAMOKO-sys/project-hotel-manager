import { Test, TestingModule } from '@nestjs/testing';
import { DynamicPricingRuleService } from './dynamic-pricing-rule.service';

describe('DynamicPricingRuleService', () => {
  let service: DynamicPricingRuleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DynamicPricingRuleService],
    }).compile();

    service = module.get<DynamicPricingRuleService>(DynamicPricingRuleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
