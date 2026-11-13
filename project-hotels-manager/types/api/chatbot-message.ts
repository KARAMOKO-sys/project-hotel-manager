// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/chatbot-message/
// =============================================================================

import type { AuditableEntity } from "./base-entities";
import type { ChatbotLanguage } from "./chatbot-conversation";
import type { PaginationQueryDto } from "./common";

export interface CreateChatbotMessageDto {
  conversation_id: string;
  sender: MessageSender;
  sender_id?: string;
  content: string;
  language?: ChatbotLanguage;
  intent?: ChatbotIntent;
  confidence?: number;
  entities?: Record<string, unknown>;
  is_service_request?: boolean;
  requires_human?: boolean;
  metadata?: Record<string, unknown>;
}

/** Filtres optionnels pour lister les messages d'une conversation. */
export interface MessageFilterQueryDto extends PaginationQueryDto {
  sender?: MessageSender;
  intent?: ChatbotIntent;
}

export type UpdateChatbotMessageDto = Partial<CreateChatbotMessageDto>;

/** Auteur d'un message. */
export enum MessageSender {
  GUEST = "guest",
  BOT = "bot",
  STAFF = "staff",
}

/** Intentions reconnues par le moteur de compréhension du chatbot. */
export enum ChatbotIntent {
  GREETING = "greeting",
  THANKS = "thanks",
  CHECK_IN_TIME = "check_in_time",
  CHECK_OUT_TIME = "check_out_time",
  WIFI = "wifi",
  TOWELS = "towels",
  WAKE_UP_CALL = "wake_up_call",
  ROOM_SERVICE = "room_service",
  RESTAURANT = "restaurant",
  BILLING = "billing",
  PARKING = "parking",
  COMPLAINT = "complaint",
  HUMAN_AGENT = "human_agent",
  UNKNOWN = "unknown",
}

/** Message échangé au sein d'une conversation du chatbot. */
export interface ChatbotMessage extends AuditableEntity {
  conversation_id: string;
  sender: MessageSender;
  /** Identifiant du client ou du membre du personnel (absent pour le bot). */
  sender_id?: string;
  content: string;
  language?: ChatbotLanguage;
  /** Intention détectée (messages client) ou traitée (réponses du bot). */
  intent?: ChatbotIntent;
  confidence?: number;
  /** Entités extraites : heure, date, numéro de chambre, quantité… */
  entities: Record<string, unknown>;
  /** Le message correspond à une demande de service (serviettes, réveil…). */
  is_service_request: boolean;
  /** Le message a déclenché (ou nécessite) l'intervention d'un humain. */
  requires_human: boolean;
  read_at?: string;
  metadata: Record<string, unknown>;
}

/** Statistiques d'intentions d'une conversation. */
export interface IntentStat {
  intent: ChatbotIntent | "none";
  count: number;
}
