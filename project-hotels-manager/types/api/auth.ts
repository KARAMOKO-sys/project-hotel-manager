// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/auth/
// =============================================================================

import type { UserType } from "./base-entities";

/** Inscription d'un nouveau client. */
export interface RegisterDto {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  pseudo?: string;
  phone?: string;
}

/** Connexion par email / mot de passe. */
export interface LoginDto {
  email: string;
  password: string;
  /** Type de compte visé lorsqu'un même email existe dans plusieurs collections (ex. client et propriétaire). */
  user_type?: UserType;
}

/** Second facteur lors de la connexion. */
export interface VerifyTwoFactorLoginDto {
  two_factor_token: string;
  code: string;
}

/** Code TOTP seul (confirmation / désactivation de la 2FA). */
export interface TwoFactorCodeDto {
  code: string;
}

/** Rafraîchissement du jeton d'accès. */
export interface RefreshTokenDto {
  refresh_token: string;
}

/** Demande par email (réinitialisation, lien magique). */
export interface EmailRequestDto {
  email: string;
  user_type?: UserType;
}

/** Jeton à usage unique (lien magique, vérification d'email). */
export interface TokenDto {
  token: string;
}

/** Réinitialisation du mot de passe via un jeton reçu par email. */
export interface ResetPasswordDto extends TokenDto {
  new_password: string;
}

/** Changement de mot de passe par l'utilisateur connecté. */
export interface ChangePasswordDto {
  current_password: string;
  new_password: string;
}

/** Usage d'un jeton à usage unique. */
export enum AuthTokenType {
  PASSWORD_RESET = "password_reset",
  MAGIC_LINK = "magic_link",
  EMAIL_VERIFICATION = "email_verification",
}

/** Jeton à usage unique envoyé par email (réinitialisation de mot de passe, lien magique, vérification d'email). Seule l'empreinte SHA-256 du jeton est stockée. Un jeton est valide tant que `used_at` est vide et que `expires_at` n'est pas dépassé. Les jetons sont supprimés automatiquement par MongoDB un jour après expiration. */
export interface AuthToken {
  user_id: string;
  user_type: UserType;
  type: AuthTokenType;
  token_hash: string;
  expires_at: string;
  used_at?: null | string;
  requested_ip?: string;
  user_agent?: string;
}

/** Jetons renvoyés après une authentification complète. */
export interface AuthTokensResponse {
  access_token: string;
  refresh_token: string;
  token_type: "Bearer";
  /** Durée de vie du jeton d'accès en secondes. */
  expires_in: number;
  user: UserProfile;
}

/** Réponse intermédiaire lorsque la 2FA est requise. */
export interface TwoFactorChallengeResponse {
  requires_two_factor: true;
  two_factor_token: string;
  expires_in: number;
}

export type LoginResponse = AuthTokensResponse | TwoFactorChallengeResponse;

/** Réponse générique (avec jeton exposé hors production uniquement). */
export interface MessageResponse {
  message: string;
  /** Présent uniquement hors production, pour faciliter les tests. */
  dev_token?: string;
}

/** Profil public renvoyé au client (sans données sensibles). */
export interface UserProfile {
  id: string;
  email: string;
  user_type: UserType;
  phone?: string;
  first_name?: string;
  last_name?: string;
  full_name: string;
  pseudo?: string;
  avatar_url?: string;
  language?: string;
  timezone?: string;
  is_active: boolean;
  is_email_verified: boolean;
  is_phone_verified: boolean;
  two_factor_enabled: boolean;
  last_login_at?: string;
  created_at?: string;
}
