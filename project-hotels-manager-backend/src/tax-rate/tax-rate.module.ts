import { Module } from '@nestjs/common';
import { TaxRateService } from './services/tax-rate.service';
import { TaxRateController } from './controllers/tax-rate.controller';

@Module({
  controllers: [TaxRateController],
  providers: [TaxRateService],
})
export class TaxRateModule {}
