import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { DynamicPricingRuleService } from '../services/dynamic-pricing-rule.service';
import { CreateDynamicPricingRuleDto } from '../dto/create-dynamic-pricing-rule.dto';
import { UpdateDynamicPricingRuleDto } from '../dto/update-dynamic-pricing-rule.dto';

@Controller('dynamic-pricing-rule')
export class DynamicPricingRuleController {
  constructor(
    private readonly dynamicPricingRuleService: DynamicPricingRuleService,
  ) {}

  @Post()
  create(@Body() createDynamicPricingRuleDto: CreateDynamicPricingRuleDto) {
    return this.dynamicPricingRuleService.create(createDynamicPricingRuleDto);
  }

  @Get()
  findAll() {
    return this.dynamicPricingRuleService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.dynamicPricingRuleService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDynamicPricingRuleDto: UpdateDynamicPricingRuleDto,
  ) {
    return this.dynamicPricingRuleService.update(
      +id,
      updateDynamicPricingRuleDto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.dynamicPricingRuleService.remove(+id);
  }
}
