// =============================================================================
// Session utilisateur : connexion, 2FA, déconnexion
// =============================================================================
//
// Surcouche de `auth.service.ts` (généré) qui enregistre les jetons renvoyés
// par le backend afin que les appels suivants soient authentifiés.

import * as auth from "./auth.service";
import { tokenStorage } from "./client";
import type {
  AuthTokensResponse,
  LoginDto,
  LoginResponse,
  RegisterDto,
  TwoFactorChallengeResponse,
} from "@/types/api";

/** Vrai si la connexion attend encore le code de double authentification. */
export function isTwoFactorChallenge(
  response: LoginResponse,
): response is TwoFactorChallengeResponse {
  return "requires_two_factor" in response && response.requires_two_factor;
}

function persist<T extends LoginResponse>(response: T): T {
  if (!isTwoFactorChallenge(response)) tokenStorage.save(response);
  return response;
}

/**
 * Connexion email / mot de passe. Si la 2FA est activée, la réponse est un
 * `TwoFactorChallengeResponse` : appelez ensuite `completeTwoFactorLogin`.
 */
export async function signIn(credentials: LoginDto): Promise<LoginResponse> {
  return persist(await auth.login(credentials));
}

/** Second facteur de connexion (code TOTP à 6 chiffres). */
export async function completeTwoFactorLogin(
  twoFactorToken: string,
  code: string,
): Promise<AuthTokensResponse> {
  return persist(
    await auth.verifyTwoFactor({ two_factor_token: twoFactorToken, code }),
  );
}

/** Connexion via le jeton reçu par lien magique. */
export async function signInWithMagicLink(token: string): Promise<LoginResponse> {
  return persist(await auth.verifyMagicLink({ token }));
}

/** Inscription d'un client : il est connecté directement. */
export async function signUp(data: RegisterDto): Promise<AuthTokensResponse> {
  return persist(await auth.register(data));
}

/** Déconnexion de la session courante (les jetons locaux sont toujours effacés). */
export async function signOut(): Promise<void> {
  try {
    if (tokenStorage.getAccessToken()) await auth.logout();
  } finally {
    tokenStorage.clear();
  }
}

/** Vrai si un jeton est présent (la validité est vérifiée par le backend). */
export function isAuthenticated(): boolean {
  return !!tokenStorage.getAccessToken();
}
