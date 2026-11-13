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
import { IaPredictionService } from '../services/ia-prediction.service';
import { CreateIaPredictionDto } from '../dto/create-ia-prediction.dto';
import { UpdateIaPredictionDto } from '../dto/update-ia-prediction.dto';
import {
  AccuracyQueryDto,
  ForecastDto,
  PendingEvaluationQueryDto,
  PredictionFilterQueryDto,
  RecordActualDto,
} from '../dto/forecast.dto';
import { IdParamDto } from '../../common/dto/id-param.dto';

@Controller('ia-predictions')
export class IaPredictionController {
  constructor(private readonly iaPredictionService: IaPredictionService) {}

  @Post()
  create(@Body() createIaPredictionDto: CreateIaPredictionDto) {
    return this.iaPredictionService.create(createIaPredictionDto);
  }

  @Post('forecast')
  forecast(@Body() dto: ForecastDto) {
    return this.iaPredictionService.forecast(dto);
  }

  @Get()
  findAll(@Query() query: PredictionFilterQueryDto) {
    return this.iaPredictionService.findAll(query, {
      ...(query.type && { type: query.type }),
      ...(query.status && { status: query.status }),
    });
  }

  @Get('accuracy')
  getAccuracy(@Query() query: AccuracyQueryDto) {
    return this.iaPredictionService.getAccuracy(query);
  }

  @Get('property/:propertyId')
  findByProperty(
    @Param('propertyId') propertyId: string,
    @Query() query: PredictionFilterQueryDto,
  ) {
    return this.iaPredictionService.findByProperty(propertyId, query);
  }

  @Get('property/:propertyId/pending-evaluation')
  getPendingEvaluation(
    @Param('propertyId') propertyId: string,
    @Query() query: PendingEvaluationQueryDto,
  ) {
    return this.iaPredictionService.getPendingEvaluation(
      propertyId,
      query.limit,
    );
  }

  @Get(':id')
  findOne(@Param() params: IdParamDto) {
    return this.iaPredictionService.findOne(params.id);
  }

  @Patch(':id')
  update(
    @Param() params: IdParamDto,
    @Body() updateIaPredictionDto: UpdateIaPredictionDto,
  ) {
    return this.iaPredictionService.update(params.id, updateIaPredictionDto);
  }

  @Patch(':id/actual')
  recordActual(@Param() params: IdParamDto, @Body() dto: RecordActualDto) {
    return this.iaPredictionService.recordActual(params.id, dto.actual_value);
  }

  @Delete(':id')
  remove(@Param() params: IdParamDto) {
    return this.iaPredictionService.remove(params.id);
  }
}
