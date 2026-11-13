// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/user-role/controllers/user-role.controller.ts
// =============================================================================

import { apiClient } from "./client";
import type { CreateUserRoleDto, ResolvedUserRole, UserRole, UserRoleQueryDto } from "@/types/api";

/** GET /user-roles/me — Rôles de l'utilisateur connecté. */
export async function findMine(query?: UserRoleQueryDto): Promise<ResolvedUserRole[]> {
  const { data } = await apiClient.get<ResolvedUserRole[]>("/user-roles/me", { params: query });
  return data;
}

/** GET /user-roles/me/permissions — Permissions de l'utilisateur connecté. */
export async function findMyPermissions(query?: UserRoleQueryDto): Promise<string[]> {
  const { data } = await apiClient.get<string[]>("/user-roles/me/permissions", { params: query });
  return data;
}

/** POST /user-roles — Assigne un rôle à un utilisateur. — Rôles requis : super_admin, owner. */
export async function assign(body: CreateUserRoleDto): Promise<UserRole> {
  const { data } = await apiClient.post<UserRole>("/user-roles", body);
  return data;
}

/** GET /user-roles/user/:id — Rôles d'un utilisateur. — Rôles requis : super_admin, owner. */
export async function findByUser(id: string, query?: UserRoleQueryDto): Promise<ResolvedUserRole[]> {
  const { data } = await apiClient.get<ResolvedUserRole[]>(`/user-roles/user/${encodeURIComponent(id)}`, { params: query });
  return data;
}

/** GET /user-roles/user/:id/permissions — Permissions d'un utilisateur. — Rôles requis : super_admin, owner. */
export async function findPermissions(id: string, query?: UserRoleQueryDto): Promise<string[]> {
  const { data } = await apiClient.get<string[]>(`/user-roles/user/${encodeURIComponent(id)}/permissions`, { params: query });
  return data;
}

/** DELETE /user-roles/:id — Supprime une assignation de rôle. — Rôles requis : super_admin. */
export async function remove(id: string): Promise<void> {
  const { data } = await apiClient.delete<void>(`/user-roles/${encodeURIComponent(id)}`);
  return data;
}
