// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/chatbot-message/controllers/chatbot-message.controller.ts
// =============================================================================

import { apiClient } from "./client";
import type { ChatbotMessage, CreateChatbotMessageDto, IntentStat, MessageFilterQueryDto, PaginatedResult, PaginationQueryDto, UpdateChatbotMessageDto } from "@/types/api";

/** POST /chatbot-messages */
export async function create(body: CreateChatbotMessageDto): Promise<ChatbotMessage> {
  const { data } = await apiClient.post<ChatbotMessage>("/chatbot-messages", body);
  return data;
}

/** GET /chatbot-messages */
export async function findAll(query?: PaginationQueryDto): Promise<PaginatedResult<ChatbotMessage>> {
  const { data } = await apiClient.get<PaginatedResult<ChatbotMessage>>("/chatbot-messages", { params: query });
  return data;
}

/** GET /chatbot-messages/requiring-human */
export async function findRequiringHuman(query?: MessageFilterQueryDto): Promise<PaginatedResult<ChatbotMessage>> {
  const { data } = await apiClient.get<PaginatedResult<ChatbotMessage>>("/chatbot-messages/requiring-human", { params: query });
  return data;
}

/** GET /chatbot-messages/conversation/:conversationId */
export async function findByConversation(conversationId: string, query?: MessageFilterQueryDto): Promise<PaginatedResult<ChatbotMessage>> {
  const { data } = await apiClient.get<PaginatedResult<ChatbotMessage>>(`/chatbot-messages/conversation/${encodeURIComponent(conversationId)}`, { params: query });
  return data;
}

/** GET /chatbot-messages/conversation/:conversationId/history */
export async function getConversationHistory(conversationId: string): Promise<ChatbotMessage[]> {
  const { data } = await apiClient.get<ChatbotMessage[]>(`/chatbot-messages/conversation/${encodeURIComponent(conversationId)}/history`);
  return data;
}

/** GET /chatbot-messages/conversation/:conversationId/intents */
export async function getIntentStats(conversationId: string): Promise<IntentStat[]> {
  const { data } = await apiClient.get<IntentStat[]>(`/chatbot-messages/conversation/${encodeURIComponent(conversationId)}/intents`);
  return data;
}

/** PATCH /chatbot-messages/conversation/:conversationId/read */
export async function markConversationAsRead(conversationId: string): Promise<{ updated: number }> {
  const { data } = await apiClient.patch<{ updated: number }>(`/chatbot-messages/conversation/${encodeURIComponent(conversationId)}/read`, undefined);
  return data;
}

/** GET /chatbot-messages/:id */
export async function findOne(id: string): Promise<ChatbotMessage> {
  const { data } = await apiClient.get<ChatbotMessage>(`/chatbot-messages/${encodeURIComponent(id)}`);
  return data;
}

/** PATCH /chatbot-messages/:id */
export async function update(id: string, body: UpdateChatbotMessageDto = {}): Promise<ChatbotMessage> {
  const { data } = await apiClient.patch<ChatbotMessage>(`/chatbot-messages/${encodeURIComponent(id)}`, body);
  return data;
}

/** PATCH /chatbot-messages/:id/read */
export async function markAsRead(id: string): Promise<ChatbotMessage> {
  const { data } = await apiClient.patch<ChatbotMessage>(`/chatbot-messages/${encodeURIComponent(id)}/read`, undefined);
  return data;
}

/** DELETE /chatbot-messages/:id */
export async function remove(id: string): Promise<ChatbotMessage> {
  const { data } = await apiClient.delete<ChatbotMessage>(`/chatbot-messages/${encodeURIComponent(id)}`);
  return data;
}
