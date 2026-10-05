import { Test, TestingModule } from '@nestjs/testing';
import { ChatbotConversationService } from './chatbot-conversation.service';

describe('ChatbotConversationService', () => {
  let service: ChatbotConversationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ChatbotConversationService],
    }).compile();

    service = module.get<ChatbotConversationService>(
      ChatbotConversationService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
