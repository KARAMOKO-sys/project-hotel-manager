import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types, SchemaTypes } from 'mongoose';
import { AuditableEntity } from '../../base-entities/embeddables/auditable.entity';

export type ChatbotConversationDocument = HydratedDocument<ChatbotConversation>;

/** Langues prises en charge par l'assistant virtuel. */
export enum ChatbotLanguage {
  FR = 'fr',
  EN = 'en',
}

/** Cycle de vie d'une conversation. */
export enum ConversationStatus {
  /** Le bot répond automatiquement. */
  OPEN = 'open',
  /** Transférée à un humain : le bot ne répond plus. */
  ESCALATED = 'escalated',
  /** Terminée : plus aucun message accepté. */
  CLOSED = 'closed',
}

/** Canal par lequel le client contacte l'assistant. */
export enum ChatbotChannel {
  WEB = 'web',
  MOBILE_APP = 'mobile_app',
  WHATSAPP = 'whatsapp',
  SMS = 'sms',
  KIOSK = 'kiosk',
}

/**
 * Conversation entre un client (ou un visiteur anonyme) et l'assistant
 * virtuel d'une propriété.
 */
@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'chatbot_conversations',
})
export class ChatbotConversation extends AuditableEntity {
  /** Identifiant de session lisible, utilisé par le widget côté client. */
  @Prop({
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxlength: 40,
    index: true,
  })
  session_id!: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Property', required: true, index: true })
  property_id!: Types.ObjectId;

  /** Absent pour un visiteur non identifié. */
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Guest', index: true })
  guest_id?: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Reservation' })
  reservation_id?: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(ChatbotLanguage),
    default: ChatbotLanguage.FR,
  })
  language!: ChatbotLanguage;

  @Prop({
    type: String,
    enum: Object.values(ConversationStatus),
    default: ConversationStatus.OPEN,
    index: true,
  })
  status!: ConversationStatus;

  @Prop({
    type: String,
    enum: Object.values(ChatbotChannel),
    default: ChatbotChannel.WEB,
  })
  channel!: ChatbotChannel;

  @Prop({ type: Number, min: 0, default: 0 })
  message_count!: number;

  /** Nombre de messages consécutifs non compris (confiance faible). */
  @Prop({ type: Number, min: 0, default: 0 })
  unresolved_count!: number;

  @Prop({ type: String, maxlength: 50 })
  last_intent?: string;

  @Prop({ type: Date })
  last_message_at?: Date;

  @Prop({ type: String, maxlength: 500 })
  escalation_reason?: string;

  @Prop({ type: Date })
  escalated_at?: Date;

  /** Membre du personnel ayant pris le relais. */
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Staff' })
  escalated_to?: Types.ObjectId;

  @Prop({ type: Date })
  closed_at?: Date;

  @Prop({ type: Number, min: 1, max: 5 })
  satisfaction_rating?: number;

  @Prop({ type: Object, default: () => ({}) })
  metadata!: Record<string, any>;
}

export const ChatbotConversationSchema =
  SchemaFactory.createForClass(ChatbotConversation);

ChatbotConversationSchema.index({ property_id: 1, status: 1 });
ChatbotConversationSchema.index({ guest_id: 1, created_at: -1 });
