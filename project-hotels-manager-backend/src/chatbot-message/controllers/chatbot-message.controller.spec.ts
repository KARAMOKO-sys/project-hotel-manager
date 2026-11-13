import { Test, TestingModule } from '@nestjs/testing';
import { ChatbotMessageController } from './chatbot-message.controller';
import { ChatbotMessageService } from '../services/chatbot-message.service';
import { MessageFilterQueryDto } from '../dto/message-filter-query.dto';

describe('ChatbotMessageController', () => {
  let controller: ChatbotMessageController;
  let service: Record<string, jest.Mock>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatbotMessageController],
      providers: [
        {
          provide: ChatbotMessageService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            findByConversation: jest.fn(),
            getConversationHistory: jest.fn(),
            getIntentStats: jest.fn(),
            markAsRead: jest.fn(),
            markConversationAsRead: jest.fn(),
            findRequiringHuman: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ChatbotMessageController>(ChatbotMessageController);
    service = module.get<ChatbotMessageService, Record<string, jest.Mock>>(
      ChatbotMessageService,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate findByConversation', () => {
    const query = new MessageFilterQueryDto();
    void controller.findByConversation('abc', query);
    expect(service.findByConversation).toHaveBeenCalledWith('abc', query);
  });

  it('should delegate markAsRead with the id param', () => {
    void controller.markAsRead({ id: '507f1f77bcf86cd799439011' });
    expect(service.markAsRead).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
  });
});
