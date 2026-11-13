// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/session/
// =============================================================================

import type { UserType } from "./base-entities";

/** Données nécessaires à la création d'une session. Usage interne (AuthService) : aucune route publique ne crée de session directement, elles sont créées lors de la connexion. */
export interface CreateSessionDto {
  user_id: string;
  user_type: UserType;
  user_agent?: string;
  ip?: string;
  /** Durée de vie de la session en secondes (défaut : configuration JWT). */
  ttl_seconds?: number;
}

/** Filtre optionnel par type d'utilisateur pour les routes d'administration. */
export interface SessionUserQueryDto {
  user_type?: UserType;
}

/** Raisons possibles de révocation d'une session. */
export enum SessionRevokeReason {
  LOGOUT = "logout",
  LOGOUT_ALL = "logout_all",
  ROTATED = "rotated",
  TOKEN_REUSE = "token_reuse",
  PASSWORD_CHANGED = "password_changed",
  ADMIN = "admin",
}

/** Session d'authentification. Une session correspond à un refresh token émis pour un appareil/navigateur. Le refresh token n'est jamais stocké en clair : seule son empreinte (`refresh_token_hash`) est conservée et elle n'est pas sélectionnée par défaut. Les utilisateurs étant répartis dans plusieurs collections (guests, owners, super_admins…), la paire (`user_id`, `user_type`) identifie le titulaire. */
export interface Session {
  user_id: string;
  user_type: UserType;
  refresh_token_hash: string;
  user_agent?: string;
  ip?: string;
  expires_at: string;
  revoked_at?: null | string;
  revoked_reason?: SessionRevokeReason;
  /** Session ayant remplacé celle-ci lors d'une rotation du refresh token. */
  replaced_by?: string;
  last_used_at?: string;
}
