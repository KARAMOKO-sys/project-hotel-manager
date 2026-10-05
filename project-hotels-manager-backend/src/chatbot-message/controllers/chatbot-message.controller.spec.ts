import { Test, TestingModule } from '@nestjs/testing';
import { ChatbotMessageController } from './chatbot-message.controller';
import { ChatbotMessageService } from '../services/chatbot-message.service';

describe('ChatbotMessageController', () => {
  let controller: ChatbotMessageController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatbotMessageController],
      providers: [ChatbotMessageService],
    }).compile();

    controller = module.get<ChatbotMessageController>(ChatbotMessageController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
