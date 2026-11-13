import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DailyPriceService } from './services/daily-price.service';
import { DailyPriceController } from './controllers/daily-price.controller';
import { DailyPrice, DailyPriceSchema } from './schemas/daily-price.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DailyPrice.name, schema: DailyPriceSchema },
    ]),
  ],
  controllers: [DailyPriceController],
  providers: [DailyPriceService],
  exports: [DailyPriceService],
})
export class DailyPriceModule {}
