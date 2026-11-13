// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/notification-log/controllers/notification-log.controller.ts
// =============================================================================

import { apiClient } from "./client";
import type { CreateNotificationLogDto, MarkAsFailedDto, MarkAsSentDto, NotificationLog, NotificationLogQueryDto, NotificationStats, NotificationStatsQueryDto, PaginatedResult, PaginationQueryDto, UpdateNotificationLogDto } from "@/types/api";

/** POST /notification-logs */
export async function create(body: CreateNotificationLogDto): Promise<NotificationLog> {
  const { data } = await apiClient.post<NotificationLog>("/notification-logs", body);
  return data;
}

/** GET /notification-logs */
export async function findAll(query?: NotificationLogQueryDto): Promise<PaginatedResult<NotificationLog>> {
  const { data } = await apiClient.get<PaginatedResult<NotificationLog>>("/notification-logs", { params: query });
  return data;
}

/** GET /notification-logs/stats */
export async function getStats(query?: NotificationStatsQueryDto): Promise<NotificationStats> {
  const { data } = await apiClient.get<NotificationStats>("/notification-logs/stats", { params: query });
  return data;
}

/** GET /notification-logs/pending-retries */
export async function findPendingRetries(query?: { limit?: number }): Promise<NotificationLog[]> {
  const { data } = await apiClient.get<NotificationLog[]>("/notification-logs/pending-retries", { params: query });
  return data;
}

/** GET /notification-logs/recipient/:recipientId/unread */
export async function findUnread(recipientId: string): Promise<NotificationLog[]> {
  const { data } = await apiClient.get<NotificationLog[]>(`/notification-logs/recipient/${encodeURIComponent(recipientId)}/unread`);
  return data;
}

/** GET /notification-logs/recipient/:recipientId */
export async function findByRecipient(recipientId: string, query?: PaginationQueryDto): Promise<PaginatedResult<NotificationLog>> {
  const { data } = await apiClient.get<PaginatedResult<NotificationLog>>(`/notification-logs/recipient/${encodeURIComponent(recipientId)}`, { params: query });
  return data;
}

/** GET /notification-logs/:id */
export async function findOne(id: string): Promise<NotificationLog> {
  const { data } = await apiClient.get<NotificationLog>(`/notification-logs/${encodeURIComponent(id)}`);
  return data;
}

/** PATCH /notification-logs/:id */
export async function update(id: string, body: UpdateNotificationLogDto = {}): Promise<NotificationLog> {
  const { data } = await apiClient.patch<NotificationLog>(`/notification-logs/${encodeURIComponent(id)}`, body);
  return data;
}

/** PATCH /notification-logs/:id/sent */
export async function markAsSent(id: string, body: MarkAsSentDto = {}): Promise<NotificationLog> {
  const { data } = await apiClient.patch<NotificationLog>(`/notification-logs/${encodeURIComponent(id)}/sent`, body);
  return data;
}

/** PATCH /notification-logs/:id/delivered */
export async function markAsDelivered(id: string): Promise<NotificationLog> {
  const { data } = await apiClient.patch<NotificationLog>(`/notification-logs/${encodeURIComponent(id)}/delivered`, undefined);
  return data;
}

/** PATCH /notification-logs/:id/read */
export async function markAsRead(id: string): Promise<NotificationLog> {
  const { data } = await apiClient.patch<NotificationLog>(`/notification-logs/${encodeURIComponent(id)}/read`, undefined);
  return data;
}

/** PATCH /notification-logs/:id/failed */
export async function markAsFailed(id: string, body: MarkAsFailedDto): Promise<NotificationLog> {
  const { data } = await apiClient.patch<NotificationLog>(`/notification-logs/${encodeURIComponent(id)}/failed`, body);
  return data;
}

/** PATCH /notification-logs/:id/retry */
export async function retry(id: string): Promise<NotificationLog> {
  const { data } = await apiClient.patch<NotificationLog>(`/notification-logs/${encodeURIComponent(id)}/retry`, undefined);
  return data;
}

/** DELETE /notification-logs/:id */
export async function remove(id: string): Promise<NotificationLog> {
  const { data } = await apiClient.delete<NotificationLog>(`/notification-logs/${encodeURIComponent(id)}`);
  return data;
}
