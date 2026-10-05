import { PartialType } from '@nestjs/mapped-types';
import { CreateDynamicPricingRuleDto } from './create-dynamic-pricing-rule.dto';

export class UpdateDynamicPricingRuleDto extends PartialType(
  CreateDynamicPricingRuleDto,
) {}
