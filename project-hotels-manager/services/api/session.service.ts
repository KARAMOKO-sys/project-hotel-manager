// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/session/controllers/session.controller.ts
// =============================================================================

import { apiClient } from "./client";
import type { Session, SessionRevokeReason, SessionUserQueryDto, UserType } from "@/types/api";

/** GET /sessions/me — Liste les sessions actives de l'utilisateur connecté. */
export async function findMine(): Promise<Array<{ current: boolean; _id: string; user_id: string; user_type: UserType; refresh_token_hash: string; user_agent?: string; ip?: string; expires_at: string; revoked_at?: null | string; revoked_reason?: SessionRevokeReason; replaced_by?: string; last_used_at?: string; created_at?: string; updated_at?: string; __v: number; id: string }>> {
  const { data } = await apiClient.get<Array<{ current: boolean; _id: string; user_id: string; user_type: UserType; refresh_token_hash: string; user_agent?: string; ip?: string; expires_at: string; revoked_at?: null | string; revoked_reason?: SessionRevokeReason; replaced_by?: string; last_used_at?: string; created_at?: string; updated_at?: string; __v: number; id: string }>>("/sessions/me");
  return data;
}

/** DELETE /sessions/me — Révoque toutes les autres sessions de l'utilisateur connecté. */
export async function revokeAllMine(): Promise<{ revoked: number }> {
  const { data } = await apiClient.delete<{ revoked: number }>("/sessions/me");
  return data;
}

/** DELETE /sessions/me/:id — Révoque une des sessions de l'utilisateur connecté. */
export async function revokeMine(id: string): Promise<void> {
  const { data } = await apiClient.delete<void>(`/sessions/me/${encodeURIComponent(id)}`);
  return data;
}

/** GET /sessions/user/:id — [Super admin] Liste les sessions actives d'un utilisateur. — Rôles requis : super_admin. */
export async function findByUser(id: string, query?: SessionUserQueryDto): Promise<Session[]> {
  const { data } = await apiClient.get<Session[]>(`/sessions/user/${encodeURIComponent(id)}`, { params: query });
  return data;
}

/** DELETE /sessions/user/:id — [Super admin] Révoque toutes les sessions d'un utilisateur. — Rôles requis : super_admin. */
export async function revokeAllForUser(id: string, query?: SessionUserQueryDto): Promise<{ revoked: number }> {
  const { data } = await apiClient.delete<{ revoked: number }>(`/sessions/user/${encodeURIComponent(id)}`, { params: query });
  return data;
}

/** POST /sessions/purge — [Super admin] Purge les sessions expirées ou révoquées anciennes. — Rôles requis : super_admin. */
export async function purge(): Promise<{ deleted: number }> {
  const { data } = await apiClient.post<{ deleted: number }>("/sessions/purge", undefined);
  return data;
}

/** DELETE /sessions/:id — [Super admin] Révoque une session quelconque. — Rôles requis : super_admin. */
export async function revoke(id: string): Promise<void> {
  const { data } = await apiClient.delete<void>(`/sessions/${encodeURIComponent(id)}`);
  return data;
}
