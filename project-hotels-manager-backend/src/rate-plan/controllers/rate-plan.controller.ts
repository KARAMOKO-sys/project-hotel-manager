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
import { RatePlanService } from '../services/rate-plan.service';
import { CreateRatePlanDto } from '../dto/create-rate-plan.dto';
import { UpdateRatePlanDto } from '../dto/update-rate-plan.dto';
import {
  ApplicableRatePlansQueryDto,
  CancellationFeeDto,
} from '../dto/rate-plan-query.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { IdParamDto } from '../../common/dto/id-param.dto';

@Controller('rate-plans')
export class RatePlanController {
  constructor(private readonly ratePlanService: RatePlanService) {}

  @Post()
  create(@Body() createRatePlanDto: CreateRatePlanDto) {
    return this.ratePlanService.create(createRatePlanDto);
  }

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.ratePlanService.findAll(query);
  }

  @Get('property/:propertyId')
  findByProperty(
    @Param('propertyId') propertyId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.ratePlanService.findByProperty(propertyId, query);
  }

  @Get('property/:propertyId/applicable')
  findApplicable(
    @Param('propertyId') propertyId: string,
    @Query() query: ApplicableRatePlansQueryDto,
  ) {
    return this.ratePlanService.findApplicable(propertyId, query);
  }

  @Get(':id')
  findOne(@Param() params: IdParamDto) {
    return this.ratePlanService.findOne(params.id);
  }

  @Post(':id/cancellation-fee')
  calculateCancellationFee(
    @Param() params: IdParamDto,
    @Body() dto: CancellationFeeDto,
  ) {
    return this.ratePlanService.calculateCancellationFee(
      params.id,
      dto.total_amount,
      dto.check_in,
      dto.cancelled_at ?? new Date(),
    );
  }

  @Patch(':id')
  update(
    @Param() params: IdParamDto,
    @Body() updateRatePlanDto: UpdateRatePlanDto,
  ) {
    return this.ratePlanService.update(params.id, updateRatePlanDto);
  }

  @Patch(':id/activate')
  activate(@Param() params: IdParamDto) {
    return this.ratePlanService.activate(params.id);
  }

  @Patch(':id/deactivate')
  deactivate(@Param() params: IdParamDto) {
    return this.ratePlanService.deactivate(params.id);
  }

  @Delete(':id')
  remove(@Param() params: IdParamDto) {
    return this.ratePlanService.remove(params.id);
  }
}
