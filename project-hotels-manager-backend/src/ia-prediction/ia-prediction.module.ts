import { Module } from '@nestjs/common';
import { IaPredictionService } from './services/ia-prediction.service';
import { IaPredictionController } from './controllers/ia-prediction.controller';

@Module({
  controllers: [IaPredictionController],
  providers: [IaPredictionService],
})
export class IaPredictionModule {}
