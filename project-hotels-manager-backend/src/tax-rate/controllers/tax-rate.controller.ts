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
import {
  TaxCalculationOptions,
  TaxRateService,
} from '../services/tax-rate.service';
import { CreateTaxRateDto } from '../dto/create-tax-rate.dto';
import { UpdateTaxRateDto } from '../dto/update-tax-rate.dto';
import {
  ApplicableTaxesQueryDto,
  CalculateTaxDto,
} from '../dto/calculate-tax.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { IdParamDto } from '../../common/dto/id-param.dto';

@Controller('tax-rates')
export class TaxRateController {
  constructor(private readonly taxRateService: TaxRateService) {}

  @Post()
  create(@Body() createTaxRateDto: CreateTaxRateDto) {
    return this.taxRateService.create(createTaxRateDto);
  }

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.taxRateService.findAll(query);
  }

  @Get('property/:propertyId')
  findByProperty(
    @Param('propertyId') propertyId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.taxRateService.findByProperty(propertyId, query);
  }

  @Get('property/:propertyId/applicable')
  getApplicableTaxes(
    @Param('propertyId') propertyId: string,
    @Query() query: ApplicableTaxesQueryDto,
  ) {
    return this.taxRateService.getApplicableTaxes(
      propertyId,
      query.date ? new Date(query.date) : new Date(),
      query.applies_to,
    );
  }

  @Post('property/:propertyId/calculate')
  calculateTaxes(
    @Param('propertyId') propertyId: string,
    @Body() dto: CalculateTaxDto,
  ) {
    return this.taxRateService.calculateTaxes(
      dto.amount,
      propertyId,
      this.toOptions(dto),
    );
  }

  @Get(':id')
  findOne(@Param() params: IdParamDto) {
    return this.taxRateService.findOne(params.id);
  }

  @Post(':id/calculate')
  calculateTax(@Param() params: IdParamDto, @Body() dto: CalculateTaxDto) {
    return this.taxRateService.calculateTax(
      params.id,
      dto.amount,
      this.toOptions(dto),
    );
  }

  @Patch(':id')
  update(
    @Param() params: IdParamDto,
    @Body() updateTaxRateDto: UpdateTaxRateDto,
  ) {
    return this.taxRateService.update(params.id, updateTaxRateDto);
  }

  @Patch(':id/activate')
  activate(@Param() params: IdParamDto) {
    return this.taxRateService.activate(params.id);
  }

  @Patch(':id/deactivate')
  deactivate(@Param() params: IdParamDto) {
    return this.taxRateService.deactivate(params.id);
  }

  @Delete(':id')
  remove(@Param() params: IdParamDto) {
    return this.taxRateService.remove(params.id);
  }

  private toOptions(dto: CalculateTaxDto): TaxCalculationOptions {
    return {
      nights: dto.nights,
      guests: dto.guests,
      date: dto.date ? new Date(dto.date) : undefined,
      appliesTo: dto.applies_to,
    };
  }
}
