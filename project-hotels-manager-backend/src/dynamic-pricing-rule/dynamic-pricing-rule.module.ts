import { Module } from '@nestjs/common';
import { DynamicPricingRuleService } from './services/dynamic-pricing-rule.service';
import { DynamicPricingRuleController } from './controllers/dynamic-pricing-rule.controller';

@Module({
  controllers: [DynamicPricingRuleController],
  providers: [DynamicPricingRuleService],
})
export class DynamicPricingRuleModule {}
