import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types, SchemaTypes } from 'mongoose';
import { AuditableEntity } from '../../base-entities/embeddables/auditable.entity';
import { ChatbotLanguage } from '../../chatbot-conversation/schemas/chatbot-conversation.entity';

export type ChatbotMessageDocument = HydratedDocument<ChatbotMessage>;

/** Auteur d'un message. */
export enum MessageSender {
  GUEST = 'guest',
  BOT = 'bot',
  STAFF = 'staff',
}

/** Intentions reconnues par le moteur de compréhension du chatbot. */
export enum ChatbotIntent {
  GREETING = 'greeting',
  THANKS = 'thanks',
  CHECK_IN_TIME = 'check_in_time',
  CHECK_OUT_TIME = 'check_out_time',
  WIFI = 'wifi',
  TOWELS = 'towels',
  WAKE_UP_CALL = 'wake_up_call',
  ROOM_SERVICE = 'room_service',
  RESTAURANT = 'restaurant',
  BILLING = 'billing',
  PARKING = 'parking',
  COMPLAINT = 'complaint',
  HUMAN_AGENT = 'human_agent',
  UNKNOWN = 'unknown',
}

/** Message échangé au sein d'une conversation du chatbot. */
@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'chatbot_messages',
})
export class ChatbotMessage extends AuditableEntity {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'ChatbotConversation',
    required: true,
    index: true,
  })
  conversation_id!: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(MessageSender),
    required: true,
  })
  sender!: MessageSender;

  /** Identifiant du client ou du membre du personnel (absent pour le bot). */
  @Prop({ type: SchemaTypes.ObjectId })
  sender_id?: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true, maxlength: 4000 })
  content!: string;

  @Prop({ type: String, enum: Object.values(ChatbotLanguage) })
  language?: ChatbotLanguage;

  /** Intention détectée (messages client) ou traitée (réponses du bot). */
  @Prop({ type: String, enum: Object.values(ChatbotIntent), index: true })
  intent?: ChatbotIntent;

  @Prop({ type: Number, min: 0, max: 1 })
  confidence?: number;

  /** Entités extraites : heure, date, numéro de chambre, quantité… */
  @Prop({ type: Object, default: () => ({}) })
  entities!: Record<string, any>;

  /** Le message correspond à une demande de service (serviettes, réveil…). */
  @Prop({ type: Boolean, default: false })
  is_service_request!: boolean;

  /** Le message a déclenché (ou nécessite) l'intervention d'un humain. */
  @Prop({ type: Boolean, default: false })
  requires_human!: boolean;

  @Prop({ type: Date })
  read_at?: Date;

  @Prop({ type: Object, default: () => ({}) })
  metadata!: Record<string, any>;
}

export const ChatbotMessageSchema =
  SchemaFactory.createForClass(ChatbotMessage);

ChatbotMessageSchema.index({ conversation_id: 1, created_at: 1 });
ChatbotMessageSchema.index({ intent: 1, created_at: -1 });
