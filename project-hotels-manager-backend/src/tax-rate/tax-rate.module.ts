import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TaxRateService } from './services/tax-rate.service';
import { TaxRateController } from './controllers/tax-rate.controller';
import { TaxRate, TaxRateSchema } from './schemas/tax-rate.entity';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: TaxRate.name, schema: TaxRateSchema }]),
  ],
  controllers: [TaxRateController],
  providers: [TaxRateService],
  exports: [TaxRateService],
})
export class TaxRateModule {}
