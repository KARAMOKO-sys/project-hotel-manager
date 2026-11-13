import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types, UpdateQuery } from 'mongoose';
import { randomBytes } from 'crypto';
import { BaseCrudService } from '../../common/services/base-crud.service';
import { BaseRepository } from '../../common/repositories/base.repository';
import {
  ChatbotConversation,
  ChatbotConversationDocument,
  ChatbotLanguage,
  ConversationStatus,
} from '../schemas/chatbot-conversation.entity';
import {
  ChatbotIntent,
  ChatbotMessage,
  ChatbotMessageDocument,
  MessageSender,
} from '../../chatbot-message/schemas/chatbot-message.entity';
import { CreateChatbotConversationDto } from '../dto/create-chatbot-conversation.dto';
import { UpdateChatbotConversationDto } from '../dto/update-chatbot-conversation.dto';
import { ConversationFilterQueryDto } from '../dto/conversation-filter-query.dto';
import {
  AnalyzeMessageDto,
  CloseConversationDto,
  EscalateConversationDto,
  GuestMessageDto,
  StaffReplyDto,
} from '../dto/guest-message.dto';
import {
  ESCALATION_INTENTS,
  ExtractedEntities,
  KeywordIntentEngine,
  LOW_CONFIDENCE_THRESHOLD,
  NluResult,
} from '../engine/keyword-intent.engine';

/** Nombre de messages incompris consécutifs avant transfert à un humain. */
export const MAX_UNRESOLVED_MESSAGES = 2;

/** Demande de service à transmettre au module « guest-request ». */
export interface ChatbotServiceRequest {
  type: ChatbotIntent;
  entities: ExtractedEntities;
  /** `false` si une information manque encore (ex. heure du réveil). */
  is_complete: boolean;
}

/** Résultat du traitement d'un message client. */
export interface GuestMessageResult {
  conversation: ChatbotConversation;
  guest_message: ChatbotMessage;
  bot_message: ChatbotMessage | null;
  nlu: NluResult;
  escalated: boolean;
  service_request: ChatbotServiceRequest | null;
}

/** Statistiques des conversations d'une propriété. */
export interface ConversationStats {
  total: number;
  open: number;
  escalated: number;
  closed: number;
  escalation_rate: number;
}

/**
 * Service de l'assistant virtuel (chatbot).
 *
 * Gère le cycle de vie des conversations et le traitement automatique des
 * messages clients via `KeywordIntentEngine` (règles déterministes fr/en,
 * remplaçable plus tard par un modèle de langage).
 */
@Injectable()
export class ChatbotConversationService extends BaseCrudService<
  ChatbotConversation,
  CreateChatbotConversationDto,
  UpdateChatbotConversationDto
> {
  private readonly engine = new KeywordIntentEngine();
  private readonly messageRepository: BaseRepository<ChatbotMessage>;

  constructor(
    @InjectModel(ChatbotConversation.name)
    protected readonly conversationModel: Model<ChatbotConversationDocument>,
    @InjectModel(ChatbotMessage.name)
    protected readonly messageModel: Model<ChatbotMessageDocument>,
  ) {
    super(conversationModel, ChatbotConversation.name);
    this.messageRepository = new BaseRepository<ChatbotMessage>(messageModel);
  }

  /** Ouvre une conversation en générant un identifiant de session unique. */
  async create(
    dto: CreateChatbotConversationDto,
  ): Promise<ChatbotConversation> {
    return super.create({
      ...dto,
      session_id: this.generateSessionId(),
      status: ConversationStatus.OPEN,
    } as CreateChatbotConversationDto);
  }

  /** Recherche une conversation par identifiant de session. */
  findBySession(sessionId: string): Promise<ChatbotConversation> {
    return this.findOneOrFail({ session_id: sessionId.toUpperCase() });
  }

  /** Conversations d'un client. */
  findByGuest(guestId: string, query: ConversationFilterQueryDto) {
    return this.findAll(query, this.buildFilter('guest_id', guestId, query));
  }

  /** Conversations d'une propriété, filtrables par statut. */
  findByProperty(propertyId: string, query: ConversationFilterQueryDto) {
    return this.findAll(
      query,
      this.buildFilter('property_id', propertyId, query),
    );
  }

  /** Historique chronologique des messages d'une conversation. */
  async getHistory(id: string, limit = 200): Promise<ChatbotMessage[]> {
    await this.findOne(id);
    return this.messageRepository.find(
      { conversation_id: new Types.ObjectId(id), is_deleted: { $ne: true } },
      { sort: 'created_at', limit },
    );
  }

  /**
   * Traite un message client : analyse NLU, persistance, réponse automatique,
   * détection des demandes de service et escalade vers un humain.
   *
   * Règles d'escalade :
   *  - demande explicite d'un humain ou réclamation → escalade immédiate ;
   *  - `MAX_UNRESOLVED_MESSAGES` messages consécutifs sous le seuil de
   *    confiance → escalade.
   * Une fois escaladée, le bot n'écrit plus : seul le personnel répond.
   */
  async handleGuestMessage(
    id: string,
    dto: GuestMessageDto,
  ): Promise<GuestMessageResult> {
    const conversation = await this.findOne(id);
    if (conversation.status === ConversationStatus.CLOSED) {
      throw new BadRequestException(
        'Conversation fermée : impossible d’envoyer un message',
      );
    }

    const nlu = this.engine.analyze(dto.content);
    const language =
      dto.language ??
      nlu.language ??
      conversation.language ??
      ChatbotLanguage.FR;
    const alreadyEscalated =
      conversation.status === ConversationStatus.ESCALATED;
    const understood = nlu.confidence >= LOW_CONFIDENCE_THRESHOLD;

    let unresolved = conversation.unresolved_count ?? 0;
    let escalationReason: string | null = null;
    if (!alreadyEscalated) {
      if (ESCALATION_INTENTS.has(nlu.intent) && understood) {
        escalationReason =
          nlu.intent === ChatbotIntent.HUMAN_AGENT
            ? 'Demande explicite d’un conseiller'
            : 'Réclamation client détectée';
      } else if (!understood) {
        unresolved += 1;
        if (unresolved >= MAX_UNRESOLVED_MESSAGES) {
          escalationReason = `Intention non comprise ${unresolved} fois de suite`;
        }
      } else {
        unresolved = 0;
      }
    }
    const escalate = escalationReason !== null;

    const serviceRequest: ChatbotServiceRequest | null =
      !alreadyEscalated && !escalate && understood && nlu.is_service_request
        ? {
            type: nlu.intent,
            entities: nlu.entities,
            is_complete:
              nlu.intent !== ChatbotIntent.WAKE_UP_CALL || !!nlu.entities.time,
          }
        : null;

    const conversationId = new Types.ObjectId(id);
    const guestMessage = await this.messageRepository.create({
      conversation_id: conversationId,
      sender: MessageSender.GUEST,
      sender_id: conversation.guest_id,
      content: dto.content,
      language,
      intent: nlu.intent,
      confidence: nlu.confidence,
      entities: nlu.entities,
      is_service_request: serviceRequest !== null,
      requires_human: escalate || alreadyEscalated,
      metadata: { matched_keywords: nlu.matched_keywords },
    });

    let botMessage: ChatbotMessage | null = null;
    if (!alreadyEscalated) {
      botMessage = await this.messageRepository.create({
        conversation_id: conversationId,
        sender: MessageSender.BOT,
        content: this.buildBotReply(nlu, language, escalate, dto),
        language,
        intent: nlu.intent,
        confidence: nlu.confidence,
        entities: {},
        requires_human: escalate,
      });
    }

    const update: UpdateQuery<ChatbotConversation> = {
      $set: {
        language,
        last_intent: nlu.intent,
        last_message_at: new Date(),
        unresolved_count: unresolved,
        ...(escalate && {
          status: ConversationStatus.ESCALATED,
          escalation_reason: escalationReason,
          escalated_at: new Date(),
        }),
      },
      $inc: { message_count: botMessage ? 2 : 1 },
    };
    const updated = await this.repository.update(id, update);

    return {
      conversation: updated ?? conversation,
      guest_message: guestMessage,
      bot_message: botMessage,
      nlu,
      escalated: escalate || alreadyEscalated,
      service_request: serviceRequest,
    };
  }

  /** Réponse d'un membre du personnel dans la conversation. */
  async staffReply(id: string, dto: StaffReplyDto): Promise<ChatbotMessage> {
    const conversation = await this.findOne(id);
    if (conversation.status === ConversationStatus.CLOSED) {
      throw new BadRequestException('Conversation fermée');
    }
    const message = await this.messageRepository.create({
      conversation_id: new Types.ObjectId(id),
      sender: MessageSender.STAFF,
      sender_id: dto.staff_id ? new Types.ObjectId(dto.staff_id) : undefined,
      content: dto.content,
      language: conversation.language,
    });
    await this.repository.update(id, {
      $set: { last_message_at: new Date() },
      $inc: { message_count: 1 },
    });
    return message;
  }

  /** Transfère manuellement la conversation à un humain. */
  async escalate(
    id: string,
    dto: EscalateConversationDto,
  ): Promise<ChatbotConversation> {
    const conversation = await this.findOne(id);
    if (conversation.status === ConversationStatus.CLOSED) {
      throw new BadRequestException(
        'Impossible d’escalader une conversation fermée',
      );
    }
    return this.applyUpdate(id, {
      status: ConversationStatus.ESCALATED,
      escalation_reason: dto.reason,
      escalated_at: new Date(),
      ...(dto.staff_id && { escalated_to: new Types.ObjectId(dto.staff_id) }),
    });
  }

  /** Clôture la conversation, avec une note de satisfaction optionnelle. */
  async close(
    id: string,
    dto: CloseConversationDto = {},
  ): Promise<ChatbotConversation> {
    const conversation = await this.findOne(id);
    if (conversation.status === ConversationStatus.CLOSED) {
      throw new BadRequestException('Conversation déjà fermée');
    }
    return this.applyUpdate(id, {
      status: ConversationStatus.CLOSED,
      closed_at: new Date(),
      ...(dto.satisfaction_rating !== undefined && {
        satisfaction_rating: dto.satisfaction_rating,
      }),
    });
  }

  /** Rouvre une conversation fermée et rend la main au bot. */
  async reopen(id: string): Promise<ChatbotConversation> {
    const conversation = await this.findOne(id);
    if (conversation.status !== ConversationStatus.CLOSED) {
      throw new BadRequestException(
        'Seule une conversation fermée peut être rouverte',
      );
    }
    return this.applyUpdate(id, {
      status: ConversationStatus.OPEN,
      unresolved_count: 0,
      closed_at: null,
    });
  }

  /** Analyse un message sans le persister (test des règles NLU). */
  analyzeMessage(dto: AnalyzeMessageDto): NluResult & { answer: string } {
    const nlu = this.engine.analyze(dto.content);
    const language = dto.language ?? nlu.language ?? ChatbotLanguage.FR;
    const escalate =
      ESCALATION_INTENTS.has(nlu.intent) &&
      nlu.confidence >= LOW_CONFIDENCE_THRESHOLD;
    return {
      ...nlu,
      answer: this.buildBotReply(nlu, language, escalate, dto),
    };
  }

  /** Réponses rapides suggérées pour la conversation. */
  async getSuggestedReplies(id: string): Promise<string[]> {
    const conversation = await this.findOne(id);
    return this.engine.suggestedReplies(
      conversation.language ?? ChatbotLanguage.FR,
      conversation.last_intent,
    );
  }

  /** Statistiques des conversations d'une propriété. */
  async getPropertyStats(propertyId: string): Promise<ConversationStats> {
    const base = {
      property_id: this.toObjectId(propertyId),
      is_deleted: { $ne: true },
    };
    const [open, escalated, closed] = await Promise.all(
      [
        ConversationStatus.OPEN,
        ConversationStatus.ESCALATED,
        ConversationStatus.CLOSED,
      ].map((status) => this.repository.count({ ...base, status })),
    );
    const total = open + escalated + closed;
    return {
      total,
      open,
      escalated,
      closed,
      escalation_rate:
        total === 0 ? 0 : Math.round((escalated / total) * 10000) / 100,
    };
  }

  /** Choisit le texte de la réponse automatique. */
  private buildBotReply(
    nlu: NluResult,
    language: ChatbotLanguage,
    escalate: boolean,
    dto: Partial<GuestMessageDto>,
  ): string {
    if (escalate) return this.engine.escalationMessage(language);
    if (nlu.confidence < LOW_CONFIDENCE_THRESHOLD) {
      return this.engine.fallbackMessage(language);
    }
    return (
      this.engine.buildAnswer(
        nlu.intent,
        language,
        nlu.entities,
        dto.context ?? {},
      ) ?? this.engine.fallbackMessage(language)
    );
  }

  private async applyUpdate(
    id: string,
    set: Record<string, unknown>,
  ): Promise<ChatbotConversation> {
    return this.update(id, set as UpdateChatbotConversationDto);
  }

  private buildFilter(
    field: 'guest_id' | 'property_id',
    id: string,
    query: ConversationFilterQueryDto,
  ): QueryFilter<ChatbotConversation> {
    return {
      [field]: this.toObjectId(id),
      ...(query.status && { status: query.status }),
    };
  }

  private toObjectId(id: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Identifiant invalide : ${id}`);
    }
    return new Types.ObjectId(id);
  }

  private generateSessionId(): string {
    return `CHT-${randomBytes(6).toString('hex').toUpperCase()}`;
  }
}
