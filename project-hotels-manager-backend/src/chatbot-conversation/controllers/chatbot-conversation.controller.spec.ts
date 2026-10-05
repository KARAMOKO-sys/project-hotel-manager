import { Test, TestingModule } from '@nestjs/testing';
import { ChatbotConversationController } from './chatbot-conversation.controller';
import { ChatbotConversationService } from '../services/chatbot-conversation.service';

describe('ChatbotConversationController', () => {
  let controller: ChatbotConversationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatbotConversationController],
      providers: [ChatbotConversationService],
    }).compile();

    controller = module.get<ChatbotConversationController>(
      ChatbotConversationController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
