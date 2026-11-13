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
import { SentimentAnalysisService } from '../services/sentiment-analysis.service';
import { CreateSentimentAnalysisDto } from '../dto/create-sentiment-analysis.dto';
import { UpdateSentimentAnalysisDto } from '../dto/update-sentiment-analysis.dto';
import {
  AcknowledgeAlertDto,
  AnalyzeTextDto,
  SentimentAlertQueryDto,
  SentimentFilterQueryDto,
  SentimentPeriodQueryDto,
  SentimentTrendQueryDto,
} from '../dto/sentiment-query.dto';
import { IdParamDto } from '../../common/dto/id-param.dto';

@Controller('sentiment-analyses')
export class SentimentAnalysisController {
  constructor(
    private readonly sentimentAnalysisService: SentimentAnalysisService,
  ) {}

  @Post()
  create(@Body() createSentimentAnalysisDto: CreateSentimentAnalysisDto) {
    return this.sentimentAnalysisService.create(createSentimentAnalysisDto);
  }

  @Post('analyze')
  analyzeText(@Body() dto: AnalyzeTextDto) {
    return this.sentimentAnalysisService.analyzeText(dto.text);
  }

  @Get()
  findAll(@Query() query: SentimentFilterQueryDto) {
    return this.sentimentAnalysisService.findAll(
      query,
      query.label ? { label: query.label } : {},
    );
  }

  @Get('property/:propertyId')
  findByProperty(
    @Param('propertyId') propertyId: string,
    @Query() query: SentimentFilterQueryDto,
  ) {
    return this.sentimentAnalysisService.findByProperty(propertyId, query);
  }

  @Get('property/:propertyId/summary')
  getSummary(
    @Param('propertyId') propertyId: string,
    @Query() query: SentimentPeriodQueryDto,
  ) {
    return this.sentimentAnalysisService.getSummary(propertyId, query);
  }

  @Get('property/:propertyId/trends')
  getTrends(
    @Param('propertyId') propertyId: string,
    @Query() query: SentimentTrendQueryDto,
  ) {
    return this.sentimentAnalysisService.getTrends(propertyId, query);
  }

  @Get('property/:propertyId/alerts')
  getAlerts(
    @Param('propertyId') propertyId: string,
    @Query() query: SentimentAlertQueryDto,
  ) {
    return this.sentimentAnalysisService.getAlerts(propertyId, query.threshold);
  }

  @Get('property/:propertyId/suggestions')
  getImprovementSuggestions(
    @Param('propertyId') propertyId: string,
    @Query() query: SentimentPeriodQueryDto,
  ) {
    return this.sentimentAnalysisService.getImprovementSuggestions(
      propertyId,
      query,
    );
  }

  @Get(':id')
  findOne(@Param() params: IdParamDto) {
    return this.sentimentAnalysisService.findOne(params.id);
  }

  @Patch(':id')
  update(
    @Param() params: IdParamDto,
    @Body() updateSentimentAnalysisDto: UpdateSentimentAnalysisDto,
  ) {
    return this.sentimentAnalysisService.update(
      params.id,
      updateSentimentAnalysisDto,
    );
  }

  @Patch(':id/acknowledge')
  acknowledgeAlert(
    @Param() params: IdParamDto,
    @Body() dto: AcknowledgeAlertDto,
  ) {
    return this.sentimentAnalysisService.acknowledgeAlert(
      params.id,
      dto.user_id,
    );
  }

  @Delete(':id')
  remove(@Param() params: IdParamDto) {
    return this.sentimentAnalysisService.remove(params.id);
  }
}
