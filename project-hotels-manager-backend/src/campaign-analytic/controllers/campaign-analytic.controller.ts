import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CampaignAnalyticService } from '../services/campaign-analytic.service';
import { IdParamDto } from '../../common/dto/id-param.dto';

@Controller('campaign-analytics')
export class CampaignAnalyticController {
  constructor(
    private readonly campaignAnalyticService: CampaignAnalyticService,
  ) {}

  @Post(':campaignId/open')
  trackOpen(
    @Param('campaignId') campaignId: string,
    @Body() body: { guest_id?: string; ip?: string },
  ) {
    return this.campaignAnalyticService.trackOpen(
      campaignId,
      body.guest_id,
      body.ip,
    );
  }

  @Post(':campaignId/click')
  trackClick(
    @Param('campaignId') campaignId: string,
    @Body() body: { guest_id?: string; link?: string },
  ) {
    return this.campaignAnalyticService.trackClick(
      campaignId,
      body.guest_id,
      body.link,
    );
  }

  @Post(':campaignId/conversion')
  trackConversion(
    @Param('campaignId') campaignId: string,
    @Body() body: { guest_id?: string; conversion_data?: Record<string, any> },
  ) {
    return this.campaignAnalyticService.trackConversion(
      campaignId,
      body.guest_id,
      body.conversion_data,
    );
  }

  @Get(':campaignId/stats')
  getRealtimeStats(@Param() params: IdParamDto) {
    return this.campaignAnalyticService.getRealtimeStats(params.id);
  }
}
