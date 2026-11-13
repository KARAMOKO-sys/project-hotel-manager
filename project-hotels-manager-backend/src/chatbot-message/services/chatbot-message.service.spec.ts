/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return --
   Le modèle Mongoose est simulé par un objet jest non typé : ces règles ne s'appliquent pas aux mocks. */
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ChatbotMessageService } from './chatbot-message.service';
import {
  ChatbotIntent,
  ChatbotMessage,
  MessageSender,
} from '../schemas/chatbot-message.entity';

describe('ChatbotMessageService', () => {
  let service: ChatbotMessageService;
  let model: any;
  let findChain: any;

  const conversationId = new Types.ObjectId().toString();
  const message = {
    _id: new Types.ObjectId(),
    conversation_id: new Types.ObjectId(conversationId),
    sender: MessageSender.GUEST,
    content: 'Bonjour',
    intent: ChatbotIntent.GREETING,
  };

  beforeEach(async () => {
    findChain = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([message]),
    };
    const ModelMock: any = function (data: any) {
      const doc = { ...data };
      doc.save = jest.fn().mockResolvedValue(doc);
      return doc;
    };
    ModelMock.find = jest.fn().mockReturnValue(findChain);
    ModelMock.countDocuments = jest
      .fn()
      .mockReturnValue({ exec: jest.fn().mockResolvedValue(1) });
    ModelMock.findById = jest
      .fn()
      .mockReturnValue({ exec: jest.fn().mockResolvedValue(message) });
    ModelMock.findByIdAndUpdate = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue({ ...message, read_at: new Date() }),
    });
    ModelMock.updateMany = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue({ modifiedCount: 3 }),
    });
    model = ModelMock;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatbotMessageService,
        { provide: getModelToken(ChatbotMessage.name), useValue: model },
      ],
    }).compile();

    service = module.get<ChatbotMessageService>(ChatbotMessageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a message', async () => {
    const result = await service.create({
      conversation_id: conversationId,
      sender: MessageSender.STAFF,
      content: 'Un agent arrive',
    });
    expect(result.content).toBe('Un agent arrive');
  });

  it('should list messages of a conversation in chronological order with filters', async () => {
    const result = await service.findByConversation(conversationId, {
      page: 1,
      limit: 10,
      sender: MessageSender.GUEST,
    } as any);
    expect(result.data).toEqual([message]);
    expect(model.find).toHaveBeenCalledWith(
      expect.objectContaining({ sender: MessageSender.GUEST }),
    );
    expect(findChain.sort).toHaveBeenCalledWith('created_at');
  });

  it('should reject an invalid conversation id', () => {
    expect(() =>
      service.findByConversation('not-an-id', { page: 1, limit: 10 } as any),
    ).toThrow(BadRequestException);
  });

  it('should return the full history', async () => {
    const result = await service.getConversationHistory(conversationId);
    expect(result).toEqual([message]);
    expect(findChain.limit).toHaveBeenCalledWith(200);
  });

  it('should mark a message as read', async () => {
    const result = await service.markAsRead(message._id.toString());
    expect(result.read_at).toBeInstanceOf(Date);
  });

  it('should throw 404 when marking an unknown message as read', async () => {
    model.findByIdAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });
    await expect(
      service.markAsRead(new Types.ObjectId().toString()),
    ).rejects.toThrow(NotFoundException);
  });

  it('should mark a whole conversation as read', async () => {
    await expect(
      service.markConversationAsRead(conversationId),
    ).resolves.toEqual({ updated: 3 });
  });

  it('should compute intent statistics', async () => {
    findChain.exec.mockResolvedValue([
      { intent: ChatbotIntent.WIFI },
      { intent: ChatbotIntent.WIFI },
      { intent: ChatbotIntent.TOWELS },
      {},
    ]);
    const stats = await service.getIntentStats(conversationId);
    expect(stats[0]).toEqual({ intent: ChatbotIntent.WIFI, count: 2 });
    expect(stats).toHaveLength(3);
  });

  it('should return empty intent statistics for no messages', () => {
    expect(ChatbotMessageService.countIntents([])).toEqual([]);
  });
});
