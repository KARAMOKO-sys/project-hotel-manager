import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { IaPredictionService } from './services/ia-prediction.service';
import { IaPredictionController } from './controllers/ia-prediction.controller';
import {
  IaPrediction,
  IaPredictionSchema,
} from './schemas/ia-prediction.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: IaPrediction.name, schema: IaPredictionSchema },
    ]),
  ],
  controllers: [IaPredictionController],
  providers: [IaPredictionService],
  exports: [IaPredictionService],
})
export class IaPredictionModule {}
