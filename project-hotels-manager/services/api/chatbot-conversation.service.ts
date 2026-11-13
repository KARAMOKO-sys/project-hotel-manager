// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/chatbot-conversation/controllers/chatbot-conversation.controller.ts
// =============================================================================

import { apiClient } from "./client";
import type { AnalyzeMessageDto, ChatbotConversation, ChatbotMessage, CloseConversationDto, ConversationFilterQueryDto, ConversationStats, CreateChatbotConversationDto, EscalateConversationDto, GuestMessageDto, GuestMessageResult, NluResult, PaginatedResult, StaffReplyDto, UpdateChatbotConversationDto } from "@/types/api";

/** POST /chatbot-conversations */
export async function create(body: CreateChatbotConversationDto): Promise<ChatbotConversation> {
  const { data } = await apiClient.post<ChatbotConversation>("/chatbot-conversations", body);
  return data;
}

/** GET /chatbot-conversations */
export async function findAll(query?: ConversationFilterQueryDto): Promise<PaginatedResult<ChatbotConversation>> {
  const { data } = await apiClient.get<PaginatedResult<ChatbotConversation>>("/chatbot-conversations", { params: query });
  return data;
}

/** POST /chatbot-conversations/analyze */
export async function analyzeMessage(body: AnalyzeMessageDto): Promise<NluResult & { answer: string }> {
  const { data } = await apiClient.post<NluResult & { answer: string }>("/chatbot-conversations/analyze", body);
  return data;
}

/** GET /chatbot-conversations/session/:sessionId */
export async function findBySession(sessionId: string): Promise<ChatbotConversation> {
  const { data } = await apiClient.get<ChatbotConversation>(`/chatbot-conversations/session/${encodeURIComponent(sessionId)}`);
  return data;
}

/** GET /chatbot-conversations/guest/:guestId */
export async function findByGuest(guestId: string, query?: ConversationFilterQueryDto): Promise<PaginatedResult<ChatbotConversation>> {
  const { data } = await apiClient.get<PaginatedResult<ChatbotConversation>>(`/chatbot-conversations/guest/${encodeURIComponent(guestId)}`, { params: query });
  return data;
}

/** GET /chatbot-conversations/property/:propertyId */
export async function findByProperty(propertyId: string, query?: ConversationFilterQueryDto): Promise<PaginatedResult<ChatbotConversation>> {
  const { data } = await apiClient.get<PaginatedResult<ChatbotConversation>>(`/chatbot-conversations/property/${encodeURIComponent(propertyId)}`, { params: query });
  return data;
}

/** GET /chatbot-conversations/property/:propertyId/stats */
export async function getPropertyStats(propertyId: string): Promise<ConversationStats> {
  const { data } = await apiClient.get<ConversationStats>(`/chatbot-conversations/property/${encodeURIComponent(propertyId)}/stats`);
  return data;
}

/** GET /chatbot-conversations/:id */
export async function findOne(id: string): Promise<ChatbotConversation> {
  const { data } = await apiClient.get<ChatbotConversation>(`/chatbot-conversations/${encodeURIComponent(id)}`);
  return data;
}

/** GET /chatbot-conversations/:id/messages */
export async function getHistory(id: string): Promise<ChatbotMessage[]> {
  const { data } = await apiClient.get<ChatbotMessage[]>(`/chatbot-conversations/${encodeURIComponent(id)}/messages`);
  return data;
}

/** GET /chatbot-conversations/:id/suggested-replies */
export async function getSuggestedReplies(id: string): Promise<string[]> {
  const { data } = await apiClient.get<string[]>(`/chatbot-conversations/${encodeURIComponent(id)}/suggested-replies`);
  return data;
}

/** POST /chatbot-conversations/:id/messages */
export async function handleGuestMessage(id: string, body: GuestMessageDto): Promise<GuestMessageResult> {
  const { data } = await apiClient.post<GuestMessageResult>(`/chatbot-conversations/${encodeURIComponent(id)}/messages`, body);
  return data;
}

/** POST /chatbot-conversations/:id/staff-reply */
export async function staffReply(id: string, body: StaffReplyDto): Promise<ChatbotMessage> {
  const { data } = await apiClient.post<ChatbotMessage>(`/chatbot-conversations/${encodeURIComponent(id)}/staff-reply`, body);
  return data;
}

/** PATCH /chatbot-conversations/:id */
export async function update(id: string, body: UpdateChatbotConversationDto = {}): Promise<ChatbotConversation> {
  const { data } = await apiClient.patch<ChatbotConversation>(`/chatbot-conversations/${encodeURIComponent(id)}`, body);
  return data;
}

/** PATCH /chatbot-conversations/:id/escalate */
export async function escalate(id: string, body: EscalateConversationDto): Promise<ChatbotConversation> {
  const { data } = await apiClient.patch<ChatbotConversation>(`/chatbot-conversations/${encodeURIComponent(id)}/escalate`, body);
  return data;
}

/** PATCH /chatbot-conversations/:id/close */
export async function close(id: string, body: CloseConversationDto = {}): Promise<ChatbotConversation> {
  const { data } = await apiClient.patch<ChatbotConversation>(`/chatbot-conversations/${encodeURIComponent(id)}/close`, body);
  return data;
}

/** PATCH /chatbot-conversations/:id/reopen */
export async function reopen(id: string): Promise<ChatbotConversation> {
  const { data } = await apiClient.patch<ChatbotConversation>(`/chatbot-conversations/${encodeURIComponent(id)}/reopen`, undefined);
  return data;
}

/** DELETE /chatbot-conversations/:id */
export async function remove(id: string): Promise<ChatbotConversation> {
  const { data } = await apiClient.delete<ChatbotConversation>(`/chatbot-conversations/${encodeURIComponent(id)}`);
  return data;
}
