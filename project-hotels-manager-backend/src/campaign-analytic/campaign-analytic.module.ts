import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CampaignAnalyticService } from './services/campaign-analytic.service';
import { CampaignAnalyticController } from './controllers/campaign-analytic.controller';
import {
  CampaignAnalytic,
  CampaignAnalyticSchema,
} from './schemas/campaign-analytic.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CampaignAnalytic.name, schema: CampaignAnalyticSchema },
    ]),
  ],
  controllers: [CampaignAnalyticController],
  providers: [CampaignAnalyticService],
  exports: [CampaignAnalyticService],
})
export class CampaignAnalyticModule {}
