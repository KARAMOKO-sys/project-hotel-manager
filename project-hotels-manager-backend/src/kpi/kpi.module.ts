import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { KpiService } from './services/kpi.service';
import { KpiController } from './controllers/kpi.controller';
import { Kpi, KpiSchema } from './schemas/kpi.entity';

@Module({
  imports: [MongooseModule.forFeature([{ name: Kpi.name, schema: KpiSchema }])],
  controllers: [KpiController],
  providers: [KpiService],
  exports: [KpiService],
})
export class KpiModule {}
