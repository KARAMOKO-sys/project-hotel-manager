import { Module } from '@nestjs/common';
import { SentimentAnalysisService } from './services/sentiment-analysis.service';
import { SentimentAnalysisController } from './controllers/sentiment-analysis.controller';

@Module({
  controllers: [SentimentAnalysisController],
  providers: [SentimentAnalysisService],
})
export class SentimentAnalysisModule {}
