import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { DynamicPricingRuleService } from '../services/dynamic-pricing-rule.service';
import { CreateDynamicPricingRuleDto } from '../dto/create-dynamic-pricing-rule.dto';
import { UpdateDynamicPricingRuleDto } from '../dto/update-dynamic-pricing-rule.dto';
import {
  CalculateAdjustedPriceDto,
  ValidateRuleDto,
} from '../dto/pricing-context.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { IdParamDto } from '../../common/dto/id-param.dto';

@Controller('dynamic-pricing-rules')
export class DynamicPricingRuleController {
  constructor(
    private readonly dynamicPricingRuleService: DynamicPricingRuleService,
  ) {}

  @Post()
  create(@Body() createDynamicPricingRuleDto: CreateDynamicPricingRuleDto) {
    return this.dynamicPricingRuleService.create(createDynamicPricingRuleDto);
  }

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.dynamicPricingRuleService.findAll(query);
  }

  @Get('property/:propertyId')
  findByProperty(
    @Param('propertyId') propertyId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.dynamicPricingRuleService.findByProperty(propertyId, query);
  }

  @Get('property/:propertyId/active')
  findActiveRules(
    @Param('propertyId') propertyId: string,
    @Query('room_type_id') roomTypeId?: string,
  ) {
    return this.dynamicPricingRuleService.findActiveRules(
      propertyId,
      roomTypeId,
    );
  }

  @Post('property/:propertyId/calculate')
  calculateAdjustedPrice(
    @Param('propertyId') propertyId: string,
    @Body() dto: CalculateAdjustedPriceDto,
  ) {
    return this.dynamicPricingRuleService.calculateAdjustedPrice(
      propertyId,
      dto,
    );
  }

  @Get(':id')
  findOne(@Param() params: IdParamDto) {
    return this.dynamicPricingRuleService.findOne(params.id);
  }

  @Patch(':id')
  update(
    @Param() params: IdParamDto,
    @Body() updateDynamicPricingRuleDto: UpdateDynamicPricingRuleDto,
  ) {
    return this.dynamicPricingRuleService.update(
      params.id,
      updateDynamicPricingRuleDto,
    );
  }

  @Patch(':id/validate')
  validateRule(@Param() params: IdParamDto, @Body() dto: ValidateRuleDto) {
    return this.dynamicPricingRuleService.validateRule(
      params.id,
      dto.validated_by,
    );
  }

  @Patch(':id/activate')
  activate(@Param() params: IdParamDto) {
    return this.dynamicPricingRuleService.activate(params.id);
  }

  @Patch(':id/deactivate')
  deactivate(@Param() params: IdParamDto) {
    return this.dynamicPricingRuleService.deactivate(params.id);
  }

  @Delete(':id')
  remove(@Param() params: IdParamDto) {
    return this.dynamicPricingRuleService.remove(params.id);
  }
}
