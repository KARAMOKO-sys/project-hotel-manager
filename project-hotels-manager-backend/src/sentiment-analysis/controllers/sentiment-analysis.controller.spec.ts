import { Test, TestingModule } from '@nestjs/testing';
import { SentimentAnalysisController } from './sentiment-analysis.controller';
import { SentimentAnalysisService } from '../services/sentiment-analysis.service';

describe('SentimentAnalysisController', () => {
  let controller: SentimentAnalysisController;
  let service: Record<string, jest.Mock>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SentimentAnalysisController],
      providers: [
        {
          provide: SentimentAnalysisService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            analyzeText: jest.fn(),
            findByProperty: jest.fn(),
            getSummary: jest.fn(),
            getTrends: jest.fn(),
            getAlerts: jest.fn(),
            acknowledgeAlert: jest.fn(),
            getImprovementSuggestions: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(SentimentAnalysisController);
    service = module.get<SentimentAnalysisService, Record<string, jest.Mock>>(
      SentimentAnalysisService,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate analyze', () => {
    void controller.analyzeText({ text: 'great' });
    expect(service.analyzeText).toHaveBeenCalledWith('great');
  });

  it('should pass the alert threshold', () => {
    void controller.getAlerts('p1', { threshold: -0.7 });
    expect(service.getAlerts).toHaveBeenCalledWith('p1', -0.7);
  });

  it('should delegate acknowledge', () => {
    void controller.acknowledgeAlert({ id: 'a' }, { user_id: 'u' });
    expect(service.acknowledgeAlert).toHaveBeenCalledWith('a', 'u');
  });
});
