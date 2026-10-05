import { Module } from '@nestjs/common';
import { KpiService } from './services/kpi.service';
import { KpiController } from './controllers/kpi.controller';

@Module({
  controllers: [KpiController],
  providers: [KpiService],
})
export class KpiModule {}
