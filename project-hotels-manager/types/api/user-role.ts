// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/user-role/
// =============================================================================

import type { UserType } from "./base-entities";

/** Assignation d'un rôle à un utilisateur. */
export interface CreateUserRoleDto {
  user_id: string;
  user_type: UserType;
  role_id: string;
  /** Limite le rôle à un établissement. */
  property_id?: string;
  /** Date d'expiration (ISO 8601) du rôle. */
  expires_at?: string;
}

/** Filtres de consultation des rôles d'un utilisateur. */
export interface UserRoleQueryDto {
  user_type?: UserType;
  /** Inclut les rôles limités à cet établissement (en plus des rôles globaux). */
  property_id?: string;
}

/** Assignation d'un rôle à un utilisateur. Un utilisateur peut cumuler plusieurs rôles (ex. client + propriétaire), éventuellement limités à un établissement (`property_id`) et/ou dans le temps (`expires_at`). Les utilisateurs étant répartis dans plusieurs collections, la paire (`user_id`, `user_type`) identifie le titulaire. */
export interface UserRole {
  user_id: string;
  user_type: UserType;
  role_id: string;
  /** Établissement auquel le rôle est limité (absent = rôle global). */
  property_id?: null | string;
  expires_at?: null | string;
  assigned_by?: string;
  assigned_by_type?: UserType;
  is_active: boolean;
}

/** Rôle assigné, avec le rôle résolu. */
export interface ResolvedUserRole {
  _id: string;
  user_id: string;
  user_type: UserType;
  property_id?: null | string;
  expires_at?: null | string;
  role: { _id: string; name: string; code: string; permissions: string[]; role_level?: number };
}
