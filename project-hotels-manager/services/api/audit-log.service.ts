// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/audit-log/controllers/audit-log.controller.ts
// =============================================================================

import { apiClient } from "./client";
import type { AuditDateRangeQueryDto, AuditLog, AuditLogQueryDto, CreateAuditLogDto, PaginatedResult, PaginationQueryDto } from "@/types/api";

/** POST /audit-logs */
export async function create(body: CreateAuditLogDto): Promise<AuditLog> {
  const { data } = await apiClient.post<AuditLog>("/audit-logs", body);
  return data;
}

/** GET /audit-logs */
export async function findAll(query?: AuditLogQueryDto): Promise<PaginatedResult<AuditLog>> {
  const { data } = await apiClient.get<PaginatedResult<AuditLog>>("/audit-logs", { params: query });
  return data;
}

/** GET /audit-logs/range */
export async function findByDateRange(query: AuditDateRangeQueryDto): Promise<PaginatedResult<AuditLog>> {
  const { data } = await apiClient.get<PaginatedResult<AuditLog>>("/audit-logs/range", { params: query });
  return data;
}

/** GET /audit-logs/entity/:entityType/:entityId */
export async function findByEntity(entityType: string, entityId: string, query?: PaginationQueryDto): Promise<PaginatedResult<AuditLog>> {
  const { data } = await apiClient.get<PaginatedResult<AuditLog>>(`/audit-logs/entity/${encodeURIComponent(entityType)}/${encodeURIComponent(entityId)}`, { params: query });
  return data;
}

/** GET /audit-logs/actor/:actorId */
export async function findByActor(actorId: string, query?: PaginationQueryDto): Promise<PaginatedResult<AuditLog>> {
  const { data } = await apiClient.get<PaginatedResult<AuditLog>>(`/audit-logs/actor/${encodeURIComponent(actorId)}`, { params: query });
  return data;
}

/** GET /audit-logs/:id */
export async function findOne(id: string): Promise<AuditLog> {
  const { data } = await apiClient.get<AuditLog>(`/audit-logs/${encodeURIComponent(id)}`);
  return data;
}
