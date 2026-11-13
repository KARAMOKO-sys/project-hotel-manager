import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RatePlanService } from './services/rate-plan.service';
import { RatePlanController } from './controllers/rate-plan.controller';
import { RatePlan, RatePlanSchema } from './schemas/rate-plan.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RatePlan.name, schema: RatePlanSchema },
    ]),
  ],
  controllers: [RatePlanController],
  providers: [RatePlanService],
  exports: [RatePlanService],
})
export class RatePlanModule {}
