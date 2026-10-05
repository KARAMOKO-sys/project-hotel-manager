import { Module } from '@nestjs/common';
import { DailyPriceService } from './services/daily-price.service';
import { DailyPriceController } from './controllers/daily-price.controller';

@Module({
  controllers: [DailyPriceController],
  providers: [DailyPriceService],
})
export class DailyPriceModule {}
