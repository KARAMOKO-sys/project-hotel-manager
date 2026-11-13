// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/chatbot-conversation/
// =============================================================================

import type { AuditableEntity } from "./base-entities";
import type { ChatbotIntent, ChatbotMessage } from "./chatbot-message";
import type { PaginationQueryDto } from "./common";

export interface ConversationFilterQueryDto extends PaginationQueryDto {
  status?: ConversationStatus;
}

export interface CreateChatbotConversationDto {
  property_id: string;
  guest_id?: string;
  reservation_id?: string;
  language?: ChatbotLanguage;
  channel?: ChatbotChannel;
  metadata?: Record<string, unknown>;
}

/** Informations de l'établissement utilisées pour personnaliser les réponses FAQ. */
export interface FaqContextDto {
  property_name?: string;
  check_in_time?: string;
  check_out_time?: string;
  wifi_name?: string;
  wifi_password?: string;
  restaurant_hours?: string;
  breakfast_hours?: string;
  parking_info?: string;
  reception_phone?: string;
}

/** Message envoyé par le client à l'assistant. */
export interface GuestMessageDto {
  content: string;
  /** Force la langue de réponse ; sinon détectée automatiquement. */
  language?: ChatbotLanguage;
  context?: FaqContextDto;
}

/** Analyse d'un message sans persistance (prévisualisation NLU). */
export interface AnalyzeMessageDto {
  content: string;
  language?: ChatbotLanguage;
}

/** Message envoyé par un membre du personnel après escalade. */
export interface StaffReplyDto {
  content: string;
  staff_id?: string;
}

export interface EscalateConversationDto {
  reason: string;
  staff_id?: string;
}

export interface CloseConversationDto {
  satisfaction_rating?: number;
}

/** Mise à jour simple des métadonnées d'une conversation. Les changements de statut passent par les routes dédiées (`escalate`, `close`, `reopen`). */
export type UpdateChatbotConversationDto = Partial<CreateChatbotConversationDto>;

/** Entités extraites d'un message. */
export interface ExtractedEntities {
  /** Heure normalisée au format HH:MM. */
  time?: string;
  /** Date ISO (AAAA-MM-JJ) ou marqueur relatif (`today`, `tomorrow`). */
  date?: string;
  room_number?: string;
  quantity?: number;
}

/** Résultat de l'analyse d'un message. */
export interface NluResult {
  intent: ChatbotIntent;
  confidence: number;
  language: ChatbotLanguage | null;
  entities: ExtractedEntities;
  /** Mots-clés ayant déclenché l'intention retenue (explicabilité). */
  matched_keywords: string[];
  is_service_request: boolean;
}

/** Langues prises en charge par l'assistant virtuel. */
export enum ChatbotLanguage {
  FR = "fr",
  EN = "en",
}

/** Cycle de vie d'une conversation. */
export enum ConversationStatus {
  OPEN = "open",
  ESCALATED = "escalated",
  CLOSED = "closed",
}

/** Canal par lequel le client contacte l'assistant. */
export enum ChatbotChannel {
  WEB = "web",
  MOBILE_APP = "mobile_app",
  WHATSAPP = "whatsapp",
  SMS = "sms",
  KIOSK = "kiosk",
}

/** Conversation entre un client (ou un visiteur anonyme) et l'assistant virtuel d'une propriété. */
export interface ChatbotConversation extends AuditableEntity {
  /** Identifiant de session lisible, utilisé par le widget côté client. */
  session_id: string;
  property_id: string;
  /** Absent pour un visiteur non identifié. */
  guest_id?: string;
  reservation_id?: string;
  language: ChatbotLanguage;
  status: ConversationStatus;
  channel: ChatbotChannel;
  message_count: number;
  /** Nombre de messages consécutifs non compris (confiance faible). */
  unresolved_count: number;
  last_intent?: string;
  last_message_at?: string;
  escalation_reason?: string;
  escalated_at?: string;
  /** Membre du personnel ayant pris le relais. */
  escalated_to?: string;
  closed_at?: string;
  satisfaction_rating?: number;
  metadata: Record<string, unknown>;
}

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
  bot_message: null | ChatbotMessage;
  nlu: NluResult;
  escalated: boolean;
  service_request: null | ChatbotServiceRequest;
}

/** Statistiques des conversations d'une propriété. */
export interface ConversationStats {
  total: number;
  open: number;
  escalated: number;
  closed: number;
  escalation_rate: number;
}
