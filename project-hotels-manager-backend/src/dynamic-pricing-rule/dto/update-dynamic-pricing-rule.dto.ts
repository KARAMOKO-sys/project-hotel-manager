import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateDynamicPricingRuleDto } from './create-dynamic-pricing-rule.dto';

/** La propriété d'une règle n'est pas modifiable. */
export class UpdateDynamicPricingRuleDto extends PartialType(
  OmitType(CreateDynamicPricingRuleDto, ['property_id'] as const),
) {}
