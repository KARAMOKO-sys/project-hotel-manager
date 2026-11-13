import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SentimentAnalysisService } from './services/sentiment-analysis.service';
import { SentimentAnalysisController } from './controllers/sentiment-analysis.controller';
import {
  SentimentAnalysis,
  SentimentAnalysisSchema,
} from './schemas/sentiment-analysis.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SentimentAnalysis.name, schema: SentimentAnalysisSchema },
    ]),
  ],
  controllers: [SentimentAnalysisController],
  providers: [SentimentAnalysisService],
  exports: [SentimentAnalysisService],
})
export class SentimentAnalysisModule {}
