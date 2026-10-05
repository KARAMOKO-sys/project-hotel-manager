import { Module } from '@nestjs/common';
import { RatePlanService } from './services/rate-plan.service';
import { RatePlanController } from './controllers/rate-plan.controller';

@Module({
  controllers: [RatePlanController],
  providers: [RatePlanService],
})
export class RatePlanModule {}
