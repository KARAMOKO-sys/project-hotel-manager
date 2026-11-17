import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types } from 'mongoose';
import { BaseCrudService } from '../../common/services/base-crud.service';
import {
  ChatbotIntent,
  ChatbotMessage,
  ChatbotMessageDocument,
  MessageSender,
} from '../schemas/chatbot-message.entity';
import { CreateChatbotMessageDto } from '../dto/create-chatbot-message.dto';
import { UpdateChatbotMessageDto } from '../dto/update-chatbot-message.dto';
import { MessageFilterQueryDto } from '../dto/message-filter-query.dto';

/** Statistiques d'intentions d'une conversation. */
export interface IntentStat {
  intent: ChatbotIntent | 'none';
  count: number;
}

/**
 * Service de gestion des messages du chatbot.
 *
 * Le traitement automatique (détection d'intention, réponse du bot) est porté
 * par `ChatbotConversationService.handleGuestMessage` ; ce service fournit la
 * persistance, l'historique et quelques statistiques.
 */
@Injectable()
export class ChatbotMessageService extends BaseCrudService<
  ChatbotMessage,
  CreateChatbotMessageDto,
  UpdateChatbotMessageDto
> {
  constructor(
    @InjectModel(ChatbotMessage.name)
    protected readonly messageModel: Model<ChatbotMessage>,
  ) {
    super(messageModel, ChatbotMessage.name);
  }

  /** Liste paginée des messages d'une conversation (ordre chronologique). */
  findByConversation(conversationId: string, query: MessageFilterQueryDto) {
    const filter: QueryFilter<ChatbotMessage> = {
      conversation_id: this.toObjectId(conversationId),
    };
    if (query.sender) filter.sender = query.sender;
    if (query.intent) filter.intent = query.intent;
    return this.findAll({ ...query, sort: query.sort ?? 'created_at' }, filter);
  }

  /** Historique complet (non paginé) d'une conversation, du plus ancien au plus récent. */
  async getConversationHistory(
    conversationId: string,
    limit = 200,
  ): Promise<ChatbotMessage[]> {
    return this.repository.find(
      {
        conversation_id: this.toObjectId(conversationId),
        is_deleted: { $ne: true },
      },
      { sort: 'created_at', limit },
    );
  }

  /** Marque un message comme lu. */
  async markAsRead(id: string): Promise<ChatbotMessage> {
    return this.update(id, { read_at: new Date() } as UpdateChatbotMessageDto);
  }

  /** Marque tous les messages non lus d'une conversation comme lus. */
  async markConversationAsRead(
    conversationId: string,
  ): Promise<{ updated: number }> {
    const result = await this.messageModel
      .updateMany(
        {
          conversation_id: this.toObjectId(conversationId),
          read_at: { $exists: false },
        },
        { $set: { read_at: new Date() } },
      )
      .exec();
    return { updated: result.modifiedCount ?? 0 };
  }

  /** Liste les messages ayant demandé une intervention humaine. */
  findRequiringHuman(query: MessageFilterQueryDto) {
    return this.findAll(query, {
      requires_human: true,
      sender: MessageSender.GUEST,
    });
  }

  /**
   * Répartition des intentions détectées dans les messages clients d'une
   * conversation, triée par fréquence décroissante.
   */
  async getIntentStats(conversationId: string): Promise<IntentStat[]> {
    const messages = await this.repository.find({
      conversation_id: this.toObjectId(conversationId),
      sender: MessageSender.GUEST,
      is_deleted: { $ne: true },
    });
    return ChatbotMessageService.countIntents(messages);
  }

  /** Comptage pur des intentions (exposé pour les tests et la réutilisation). */
  static countIntents(
    messages: Pick<ChatbotMessage, 'intent'>[],
  ): IntentStat[] {
    const counts = new Map<ChatbotIntent | 'none', number>();
    for (const message of messages) {
      const key = message.intent ?? 'none';
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([intent, count]) => ({ intent, count }))
      .sort((a, b) => b.count - a.count || a.intent.localeCompare(b.intent));
  }

  private toObjectId(id: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Identifiant invalide : ${id}`);
    }
    return new Types.ObjectId(id);
  }
}
