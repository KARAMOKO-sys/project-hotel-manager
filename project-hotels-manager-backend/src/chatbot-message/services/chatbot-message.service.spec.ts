import { Test, TestingModule } from '@nestjs/testing';
import { ChatbotMessageService } from './chatbot-message.service';

describe('ChatbotMessageService', () => {
  let service: ChatbotMessageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ChatbotMessageService],
    }).compile();

    service = module.get<ChatbotMessageService>(ChatbotMessageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
