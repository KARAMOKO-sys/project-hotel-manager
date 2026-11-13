import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DynamicPricingRuleService } from './services/dynamic-pricing-rule.service';
import { DynamicPricingRuleController } from './controllers/dynamic-pricing-rule.controller';
import {
  DynamicPricingRule,
  DynamicPricingRuleSchema,
} from './schemas/dynamic-pricing-rule.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DynamicPricingRule.name, schema: DynamicPricingRuleSchema },
    ]),
  ],
  controllers: [DynamicPricingRuleController],
  providers: [DynamicPricingRuleService],
  exports: [DynamicPricingRuleService],
})
export class DynamicPricingRuleModule {}
