import { Test, TestingModule } from '@nestjs/testing';
import { SentimentAnalysisController } from './sentiment-analysis.controller';
import { SentimentAnalysisService } from '../services/sentiment-analysis.service';

describe('SentimentAnalysisController', () => {
  let controller: SentimentAnalysisController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SentimentAnalysisController],
      providers: [SentimentAnalysisService],
    }).compile();

    controller = module.get<SentimentAnalysisController>(
      SentimentAnalysisController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
