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
import { RecommendationService } from '../services/recommendation.service';
import { CreateRecommendationDto } from '../dto/create-recommendation.dto';
import { UpdateRecommendationDto } from '../dto/update-recommendation.dto';
import {
  GenerateRecommendationsDto,
  ScoreCandidatesDto,
} from '../dto/generate-recommendations.dto';
import {
  AcceptRecommendationDto,
  ConversionStatsQueryDto,
  DismissRecommendationDto,
  RecommendationFilterQueryDto,
} from '../dto/recommendation-query.dto';
import { IdParamDto } from '../../common/dto/id-param.dto';

@Controller('recommendations')
export class RecommendationController {
  constructor(private readonly recommendationService: RecommendationService) {}

  @Post()
  create(@Body() createRecommendationDto: CreateRecommendationDto) {
    return this.recommendationService.create(createRecommendationDto);
  }

  @Post('generate')
  generateForGuest(@Body() dto: GenerateRecommendationsDto) {
    return this.recommendationService.generateForGuest(dto);
  }

  @Post('score')
  scoreCandidates(@Body() dto: ScoreCandidatesDto) {
    return this.recommendationService.scoreCandidates(dto);
  }

  @Post('expire')
  expireOutdated() {
    return this.recommendationService.expireOutdated();
  }

  @Get()
  findAll(@Query() query: RecommendationFilterQueryDto) {
    return this.recommendationService.findAll(query, {
      ...(query.status && { status: query.status }),
      ...(query.type && { type: query.type }),
    });
  }

  @Get('stats')
  getConversionStats(@Query() query: ConversionStatsQueryDto) {
    return this.recommendationService.getConversionStats(query);
  }

  @Get('guest/:guestId')
  findByGuest(
    @Param('guestId') guestId: string,
    @Query() query: RecommendationFilterQueryDto,
  ) {
    return this.recommendationService.findByGuest(guestId, query);
  }

  @Get('guest/:guestId/active')
  getActiveForGuest(@Param('guestId') guestId: string) {
    return this.recommendationService.getActiveForGuest(guestId);
  }

  @Get(':id')
  findOne(@Param() params: IdParamDto) {
    return this.recommendationService.findOne(params.id);
  }

  @Patch(':id')
  update(
    @Param() params: IdParamDto,
    @Body() updateRecommendationDto: UpdateRecommendationDto,
  ) {
    return this.recommendationService.update(
      params.id,
      updateRecommendationDto,
    );
  }

  @Patch(':id/shown')
  markAsShown(@Param() params: IdParamDto) {
    return this.recommendationService.markAsShown(params.id);
  }

  @Patch(':id/accept')
  accept(@Param() params: IdParamDto, @Body() dto: AcceptRecommendationDto) {
    return this.recommendationService.accept(params.id, dto);
  }

  @Patch(':id/dismiss')
  dismiss(@Param() params: IdParamDto, @Body() dto: DismissRecommendationDto) {
    return this.recommendationService.dismiss(params.id, dto.reason);
  }

  @Delete(':id')
  remove(@Param() params: IdParamDto) {
    return this.recommendationService.remove(params.id);
  }
}
