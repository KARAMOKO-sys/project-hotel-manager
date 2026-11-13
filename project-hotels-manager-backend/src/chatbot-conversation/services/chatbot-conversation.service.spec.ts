/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return --
   Le modèle Mongoose est simulé par un objet jest non typé : ces règles ne s'appliquent pas aux mocks. */
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import {
  ChatbotConversationService,
  MAX_UNRESOLVED_MESSAGES,
} from './chatbot-conversation.service';
import {
  ChatbotConversation,
  ChatbotLanguage,
  ConversationStatus,
} from '../schemas/chatbot-conversation.entity';
import {
  ChatbotIntent,
  ChatbotMessage,
  MessageSender,
} from '../../chatbot-message/schemas/chatbot-message.entity';

function buildModelMock(findResult: any) {
  const ModelMock: any = function (data: any) {
    const doc = { _id: new Types.ObjectId(), ...data };
    doc.save = jest.fn().mockResolvedValue(doc);
    return doc;
  };
  ModelMock.findById = jest
    .fn()
    .mockReturnValue({ exec: jest.fn().mockResolvedValue(findResult) });
  ModelMock.findByIdAndUpdate = jest.fn().mockImplementation((_id, data) => ({
    exec: jest
      .fn()
      .mockResolvedValue({ ...findResult, ...(data.$set ?? data) }),
  }));
  ModelMock.findOne = jest
    .fn()
    .mockReturnValue({ exec: jest.fn().mockResolvedValue(findResult) });
  ModelMock.find = jest.fn().mockReturnValue({
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([findResult]),
  });
  ModelMock.countDocuments = jest
    .fn()
    .mockReturnValue({ exec: jest.fn().mockResolvedValue(1) });
  return ModelMock;
}

describe('ChatbotConversationService', () => {
  let service: ChatbotConversationService;
  let conversationModel: any;
  let messageModel: any;
  let conversation: any;

  const id = new Types.ObjectId().toString();

  beforeEach(async () => {
    conversation = {
      _id: new Types.ObjectId(id),
      session_id: 'CHT-ABC',
      property_id: new Types.ObjectId(),
      guest_id: new Types.ObjectId(),
      language: ChatbotLanguage.FR,
      status: ConversationStatus.OPEN,
      unresolved_count: 0,
      message_count: 0,
    };
    conversationModel = buildModelMock(conversation);
    messageModel = buildModelMock({ content: 'msg' });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatbotConversationService,
        {
          provide: getModelToken(ChatbotConversation.name),
          useValue: conversationModel,
        },
        { provide: getModelToken(ChatbotMessage.name), useValue: messageModel },
      ],
    }).compile();

    service = module.get<ChatbotConversationService>(
      ChatbotConversationService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a conversation with a session id', async () => {
    const result = await service.create({
      property_id: new Types.ObjectId().toString(),
    });
    expect(result.session_id).toMatch(/^CHT-[0-9A-F]{12}$/);
    expect(result.status).toBe(ConversationStatus.OPEN);
  });

  describe('handleGuestMessage', () => {
    it('should answer a FAQ question and reset unresolved count', async () => {
      conversation.unresolved_count = 1;
      const result = await service.handleGuestMessage(id, {
        content: 'À quelle heure est le check-out ?',
        context: { check_out_time: '11:00' },
      });
      expect(result.nlu.intent).toBe(ChatbotIntent.CHECK_OUT_TIME);
      expect(result.bot_message?.content).toContain('11:00');
      expect(result.bot_message?.sender).toBe(MessageSender.BOT);
      expect(result.guest_message.sender).toBe(MessageSender.GUEST);
      expect(result.escalated).toBe(false);
      expect(result.service_request).toBeNull();
      const update = conversationModel.findByIdAndUpdate.mock.calls[0][1];
      expect(update.$set.unresolved_count).toBe(0);
      expect(update.$inc.message_count).toBe(2);
    });

    it('should detect a service request with entities', async () => {
      const result = await service.handleGuestMessage(id, {
        content: 'Je voudrais 3 serviettes pour la chambre 12',
      });
      expect(result.service_request).toEqual({
        type: ChatbotIntent.TOWELS,
        entities: { quantity: 3, room_number: '12' },
        is_complete: true,
      });
      expect(result.guest_message.is_service_request).toBe(true);
      expect(result.bot_message?.content).toContain('3 serviette');
    });

    it('should flag an incomplete wake-up call request', async () => {
      const result = await service.handleGuestMessage(id, {
        content: 'Can I have a wake-up call?',
      });
      expect(result.service_request?.is_complete).toBe(false);
      expect(result.bot_message?.content).toContain('What time');
    });

    it('should answer with a fallback on unknown intent without escalating the first time', async () => {
      const result = await service.handleGuestMessage(id, {
        content: 'blablabla',
        language: ChatbotLanguage.EN,
      });
      expect(result.nlu.intent).toBe(ChatbotIntent.UNKNOWN);
      expect(result.escalated).toBe(false);
      expect(result.bot_message?.content).toContain('rephrase');
      const update = conversationModel.findByIdAndUpdate.mock.calls[0][1];
      expect(update.$set.unresolved_count).toBe(1);
    });

    it('should escalate after repeated low-confidence messages', async () => {
      conversation.unresolved_count = MAX_UNRESOLVED_MESSAGES - 1;
      const result = await service.handleGuestMessage(id, {
        content: 'xyz ???',
      });
      expect(result.escalated).toBe(true);
      const update = conversationModel.findByIdAndUpdate.mock.calls[0][1];
      expect(update.$set.status).toBe(ConversationStatus.ESCALATED);
      expect(update.$set.escalation_reason).toContain('non comprise');
    });

    it('should escalate immediately on explicit human request', async () => {
      const result = await service.handleGuestMessage(id, {
        content: 'Je veux parler à un conseiller',
      });
      expect(result.escalated).toBe(true);
      expect(result.guest_message.requires_human).toBe(true);
      expect(result.bot_message?.content).toContain('transfère');
    });

    it('should not reply as bot when conversation is already escalated', async () => {
      conversation.status = ConversationStatus.ESCALATED;
      const result = await service.handleGuestMessage(id, {
        content: 'Le wifi svp',
      });
      expect(result.bot_message).toBeNull();
      expect(result.service_request).toBeNull();
      const update = conversationModel.findByIdAndUpdate.mock.calls[0][1];
      expect(update.$inc.message_count).toBe(1);
    });

    it('should refuse messages on a closed conversation', async () => {
      conversation.status = ConversationStatus.CLOSED;
      await expect(
        service.handleGuestMessage(id, { content: 'hello' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw 404 for an unknown conversation', async () => {
      conversationModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      await expect(
        service.handleGuestMessage(id, { content: 'hello' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('lifecycle', () => {
    it('should escalate manually', async () => {
      const staffId = new Types.ObjectId().toString();
      const result = await service.escalate(id, {
        reason: 'VIP',
        staff_id: staffId,
      });
      expect(result.status).toBe(ConversationStatus.ESCALATED);
      expect(String(result.escalated_to)).toBe(staffId);
    });

    it('should not escalate a closed conversation', async () => {
      conversation.status = ConversationStatus.CLOSED;
      await expect(service.escalate(id, { reason: 'x' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should close with a rating', async () => {
      const result = await service.close(id, { satisfaction_rating: 5 });
      expect(result.status).toBe(ConversationStatus.CLOSED);
      expect(result.satisfaction_rating).toBe(5);
    });

    it('should not close twice', async () => {
      conversation.status = ConversationStatus.CLOSED;
      await expect(service.close(id)).rejects.toThrow(BadRequestException);
    });

    it('should reopen only closed conversations', async () => {
      await expect(service.reopen(id)).rejects.toThrow(BadRequestException);
      conversation.status = ConversationStatus.CLOSED;
      const result = await service.reopen(id);
      expect(result.status).toBe(ConversationStatus.OPEN);
    });

    it('should store a staff reply', async () => {
      const result = await service.staffReply(id, { content: 'Bonjour' });
      expect(result.sender).toBe(MessageSender.STAFF);
    });
  });

  it('should analyze a message without persisting it', () => {
    const result = service.analyzeMessage({ content: 'wifi password?' });
    expect(result.intent).toBe(ChatbotIntent.WIFI);
    expect(result.answer).toContain('Wi-Fi');
    expect(messageModel.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('should return the history of an existing conversation', async () => {
    await expect(service.getHistory(id)).resolves.toEqual([{ content: 'msg' }]);
  });

  it('should compute property stats', async () => {
    const stats = await service.getPropertyStats(
      new Types.ObjectId().toString(),
    );
    expect(stats).toEqual({
      total: 3,
      open: 1,
      escalated: 1,
      closed: 1,
      escalation_rate: 33.33,
    });
  });

  it('should return zero escalation rate when no conversation', async () => {
    conversationModel.countDocuments.mockReturnValue({
      exec: jest.fn().mockResolvedValue(0),
    });
    const stats = await service.getPropertyStats(
      new Types.ObjectId().toString(),
    );
    expect(stats.escalation_rate).toBe(0);
  });

  it('should reject invalid property ids', () => {
    expect(() =>
      service.findByProperty('bad', { page: 1, limit: 10 } as any),
    ).toThrow(BadRequestException);
  });
});
