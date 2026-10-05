import { Injectable } from '@nestjs/common';
import { CreateDynamicPricingRuleDto } from '../dto/create-dynamic-pricing-rule.dto';
import { UpdateDynamicPricingRuleDto } from '../dto/update-dynamic-pricing-rule.dto';

@Injectable()
export class DynamicPricingRuleService {
  create(createDynamicPricingRuleDto: CreateDynamicPricingRuleDto) {
    return 'This action adds a new dynamicPricingRule';
  }

  findAll() {
    return `This action returns all dynamicPricingRule`;
  }

  findOne(id: number) {
    return `This action returns a #${id} dynamicPricingRule`;
  }

  update(id: number, updateDynamicPricingRuleDto: UpdateDynamicPricingRuleDto) {
    return `This action updates a #${id} dynamicPricingRule`;
  }

  remove(id: number) {
    return `This action removes a #${id} dynamicPricingRule`;
  }
}
