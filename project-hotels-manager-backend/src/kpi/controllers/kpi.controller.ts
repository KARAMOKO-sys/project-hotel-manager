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
import { KpiService } from '../services/kpi.service';
import {
  ComparePeriodsDto,
  CreateKpiDto,
  KpiInputDto,
} from '../dto/create-kpi.dto';
import { UpdateKpiDto } from '../dto/update-kpi.dto';
import {
  KpiFilterQueryDto,
  KpiLatestQueryDto,
  KpiTrendQueryDto,
} from '../dto/kpi-query.dto';
import { IdParamDto } from '../../common/dto/id-param.dto';

@Controller('kpis')
export class KpiController {
  constructor(private readonly kpiService: KpiService) {}

  @Post()
  create(@Body() createKpiDto: CreateKpiDto) {
    return this.kpiService.create(createKpiDto);
  }

  @Post('calculate')
  calculate(@Body() input: KpiInputDto) {
    return this.kpiService.calculate(input);
  }

  @Post('compare')
  comparePeriods(@Body() dto: ComparePeriodsDto) {
    return this.kpiService.comparePeriods(dto);
  }

  @Get()
  findAll(@Query() query: KpiFilterQueryDto) {
    return this.kpiService.findAll(
      query,
      query.period_type ? { period_type: query.period_type } : {},
    );
  }

  @Get('property/:propertyId')
  findByProperty(
    @Param('propertyId') propertyId: string,
    @Query() query: KpiFilterQueryDto,
  ) {
    return this.kpiService.findByProperty(propertyId, query);
  }

  @Get('property/:propertyId/latest')
  getLatest(
    @Param('propertyId') propertyId: string,
    @Query() query: KpiLatestQueryDto,
  ) {
    return this.kpiService.getLatest(propertyId, query.period_type);
  }

  @Get('property/:propertyId/trend')
  getTrend(
    @Param('propertyId') propertyId: string,
    @Query() query: KpiTrendQueryDto,
  ) {
    return this.kpiService.getTrend(propertyId, query);
  }

  @Get(':id')
  findOne(@Param() params: IdParamDto) {
    return this.kpiService.findOne(params.id);
  }

  @Get(':id/comparison')
  compareWithPrevious(@Param() params: IdParamDto) {
    return this.kpiService.compareWithPrevious(params.id);
  }

  @Patch(':id')
  update(@Param() params: IdParamDto, @Body() updateKpiDto: UpdateKpiDto) {
    return this.kpiService.update(params.id, updateKpiDto);
  }

  @Delete(':id')
  remove(@Param() params: IdParamDto) {
    return this.kpiService.remove(params.id);
  }
}
