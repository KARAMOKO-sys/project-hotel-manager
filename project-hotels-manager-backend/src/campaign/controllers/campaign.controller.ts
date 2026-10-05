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
import { CampaignService } from '../services/campaign.service';
import { CreateCampaignDto } from '../dto/create-campaign.dto';
import { UpdateCampaignDto } from '../dto/update-campaign.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { IdParamDto } from '../../common/dto/id-param.dto';

@Controller('campaigns')
export class CampaignController {
  constructor(private readonly campaignService: CampaignService) {}

  @Post()
  create(@Body() createCampaignDto: CreateCampaignDto) {
    return this.campaignService.create(createCampaignDto);
  }

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.campaignService.findAll(query);
  }

  @Get('property/:propertyId')
  findByProperty(
    @Param('propertyId') propertyId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.campaignService.findByProperty(propertyId, query);
  }

  @Get(':id')
  findOne(@Param() params: IdParamDto) {
    return this.campaignService.findOne(params.id);
  }

  @Patch(':id')
  update(
    @Param() params: IdParamDto,
    @Body() updateCampaignDto: UpdateCampaignDto,
  ) {
    return this.campaignService.update(params.id, updateCampaignDto);
  }

  @Patch(':id/schedule')
  schedule(
    @Param() params: IdParamDto,
    @Body() body: { scheduled_at: string },
  ) {
    return this.campaignService.schedule(
      params.id,
      new Date(body.scheduled_at),
    );
  }

  @Patch(':id/cancel')
  cancel(@Param() params: IdParamDto) {
    return this.campaignService.cancel(params.id);
  }

  @Patch(':id/send')
  send(@Param() params: IdParamDto) {
    return this.campaignService.send(params.id);
  }

  @Get(':id/statistics')
  getStatistics(@Param() params: IdParamDto) {
    return this.campaignService.getStatistics(params.id);
  }

  @Delete(':id')
  remove(@Param() params: IdParamDto) {
    return this.campaignService.remove(params.id);
  }
}
