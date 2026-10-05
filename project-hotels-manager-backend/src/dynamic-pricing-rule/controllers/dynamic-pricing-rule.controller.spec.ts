import { Test, TestingModule } from '@nestjs/testing';
import { DynamicPricingRuleController } from './dynamic-pricing-rule.controller';
import { DynamicPricingRuleService } from '../services/dynamic-pricing-rule.service';

describe('DynamicPricingRuleController', () => {
  let controller: DynamicPricingRuleController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DynamicPricingRuleController],
      providers: [DynamicPricingRuleService],
    }).compile();

    controller = module.get<DynamicPricingRuleController>(
      DynamicPricingRuleController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
