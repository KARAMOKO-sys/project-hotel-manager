// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/webhook-log/controllers/webhook-log.controller.ts
// =============================================================================

import { apiClient } from "./client";
import type { CreateWebhookLogDto, IgnoreWebhookDto, MarkWebhookFailedDto, MarkWebhookProcessedDto, PaginatedResult, UpdateWebhookLogDto, VerifySignatureDto, WebhookLog, WebhookLogQueryDto, WebhookProvider, WebhookStats } from "@/types/api";

/** POST /webhook-logs */
export async function create(body: CreateWebhookLogDto): Promise<WebhookLog> {
  const { data } = await apiClient.post<WebhookLog>("/webhook-logs", body);
  return data;
}

/** GET /webhook-logs */
export async function findAll(query?: WebhookLogQueryDto): Promise<PaginatedResult<WebhookLog>> {
  const { data } = await apiClient.get<PaginatedResult<WebhookLog>>("/webhook-logs", { params: query });
  return data;
}

/** GET /webhook-logs/stats */
export async function getStats(query?: { provider?: WebhookProvider; from?: string; to?: string }): Promise<WebhookStats> {
  const { data } = await apiClient.get<WebhookStats>("/webhook-logs/stats", { params: query });
  return data;
}

/** GET /webhook-logs/retryable */
export async function findRetryable(query?: { limit?: number }): Promise<WebhookLog[]> {
  const { data } = await apiClient.get<WebhookLog[]>("/webhook-logs/retryable", { params: query });
  return data;
}

/** GET /webhook-logs/provider/:provider/event/:eventId */
export async function findByEvent(provider: string, eventId: string): Promise<WebhookLog> {
  const { data } = await apiClient.get<WebhookLog>(`/webhook-logs/provider/${encodeURIComponent(provider)}/event/${encodeURIComponent(eventId)}`);
  return data;
}

/** GET /webhook-logs/:id */
export async function findOne(id: string): Promise<WebhookLog> {
  const { data } = await apiClient.get<WebhookLog>(`/webhook-logs/${encodeURIComponent(id)}`);
  return data;
}

/** PATCH /webhook-logs/:id */
export async function update(id: string, body: UpdateWebhookLogDto = {}): Promise<WebhookLog> {
  const { data } = await apiClient.patch<WebhookLog>(`/webhook-logs/${encodeURIComponent(id)}`, body);
  return data;
}

/** PATCH /webhook-logs/:id/signature */
export async function setSignatureVerification(id: string, body: VerifySignatureDto): Promise<WebhookLog> {
  const { data } = await apiClient.patch<WebhookLog>(`/webhook-logs/${encodeURIComponent(id)}/signature`, body);
  return data;
}

/** PATCH /webhook-logs/:id/processing */
export async function markAsProcessing(id: string): Promise<WebhookLog> {
  const { data } = await apiClient.patch<WebhookLog>(`/webhook-logs/${encodeURIComponent(id)}/processing`, undefined);
  return data;
}

/** PATCH /webhook-logs/:id/processed */
export async function markAsProcessed(id: string, body: MarkWebhookProcessedDto = {}): Promise<WebhookLog> {
  const { data } = await apiClient.patch<WebhookLog>(`/webhook-logs/${encodeURIComponent(id)}/processed`, body);
  return data;
}

/** PATCH /webhook-logs/:id/failed */
export async function markAsFailed(id: string, body: MarkWebhookFailedDto): Promise<WebhookLog> {
  const { data } = await apiClient.patch<WebhookLog>(`/webhook-logs/${encodeURIComponent(id)}/failed`, body);
  return data;
}

/** PATCH /webhook-logs/:id/ignore */
export async function markAsIgnored(id: string, body: IgnoreWebhookDto = {}): Promise<WebhookLog> {
  const { data } = await apiClient.patch<WebhookLog>(`/webhook-logs/${encodeURIComponent(id)}/ignore`, body);
  return data;
}

/** PATCH /webhook-logs/:id/retry */
export async function retry(id: string): Promise<WebhookLog> {
  const { data } = await apiClient.patch<WebhookLog>(`/webhook-logs/${encodeURIComponent(id)}/retry`, undefined);
  return data;
}

/** DELETE /webhook-logs/:id */
export async function remove(id: string): Promise<WebhookLog> {
  const { data } = await apiClient.delete<WebhookLog>(`/webhook-logs/${encodeURIComponent(id)}`);
  return data;
}
