import { Test, TestingModule } from '@nestjs/testing';
import { ChatbotConversationController } from './chatbot-conversation.controller';
import { ChatbotConversationService } from '../services/chatbot-conversation.service';
import { ConversationFilterQueryDto } from '../dto/conversation-filter-query.dto';
import { ConversationStatus } from '../schemas/chatbot-conversation.entity';

describe('ChatbotConversationController', () => {
  let controller: ChatbotConversationController;
  let service: Record<string, jest.Mock>;
  const id = '507f1f77bcf86cd799439011';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatbotConversationController],
      providers: [
        {
          provide: ChatbotConversationService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            findBySession: jest.fn(),
            findByGuest: jest.fn(),
            findByProperty: jest.fn(),
            getPropertyStats: jest.fn(),
            getHistory: jest.fn(),
            getSuggestedReplies: jest.fn(),
            handleGuestMessage: jest.fn(),
            staffReply: jest.fn(),
            analyzeMessage: jest.fn(),
            escalate: jest.fn(),
            close: jest.fn(),
            reopen: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(ChatbotConversationController);
    service = module.get<ChatbotConversationService, Record<string, jest.Mock>>(
      ChatbotConversationService,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate guest messages', () => {
    void controller.handleGuestMessage({ id }, { content: 'wifi' });
    expect(service.handleGuestMessage).toHaveBeenCalledWith(id, {
      content: 'wifi',
    });
  });

  it('should pass the status filter on findAll', () => {
    const query = Object.assign(new ConversationFilterQueryDto(), {
      status: ConversationStatus.OPEN,
    });
    void controller.findAll(query);
    expect(service.findAll).toHaveBeenCalledWith(query, {
      status: ConversationStatus.OPEN,
    });
  });

  it('should delegate escalate', () => {
    void controller.escalate({ id }, { reason: 'VIP' });
    expect(service.escalate).toHaveBeenCalledWith(id, { reason: 'VIP' });
  });
});
