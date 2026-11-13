// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/auth/controllers/auth.controller.ts
// =============================================================================

import { apiClient } from "./client";
import type { AuthTokensResponse, ChangePasswordDto, EmailRequestDto, LoginDto, LoginResponse, MessageResponse, RefreshTokenDto, RegisterDto, ResetPasswordDto, TokenDto, TwoFactorCodeDto, UserProfile, VerifyTwoFactorLoginDto } from "@/types/api";

/** POST /auth/register — Route publique. */
export async function register(body: RegisterDto): Promise<AuthTokensResponse & { dev_token?: string }> {
  const { data } = await apiClient.post<AuthTokensResponse & { dev_token?: string }>("/auth/register", body);
  return data;
}

/** POST /auth/login — Route publique. */
export async function login(body: LoginDto): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>("/auth/login", body);
  return data;
}

/** POST /auth/2fa/verify — Route publique. */
export async function verifyTwoFactor(body: VerifyTwoFactorLoginDto): Promise<AuthTokensResponse> {
  const { data } = await apiClient.post<AuthTokensResponse>("/auth/2fa/verify", body);
  return data;
}

/** POST /auth/refresh — Route publique. */
export async function refresh(body: RefreshTokenDto): Promise<AuthTokensResponse> {
  const { data } = await apiClient.post<AuthTokensResponse>("/auth/refresh", body);
  return data;
}

/** POST /auth/password/forgot — Route publique. */
export async function forgotPassword(body: EmailRequestDto): Promise<MessageResponse> {
  const { data } = await apiClient.post<MessageResponse>("/auth/password/forgot", body);
  return data;
}

/** POST /auth/password/reset — Route publique. */
export async function resetPassword(body: ResetPasswordDto): Promise<{ success: true }> {
  const { data } = await apiClient.post<{ success: true }>("/auth/password/reset", body);
  return data;
}

/** POST /auth/magic-link — Route publique. */
export async function magicLink(body: EmailRequestDto): Promise<MessageResponse> {
  const { data } = await apiClient.post<MessageResponse>("/auth/magic-link", body);
  return data;
}

/** POST /auth/magic-link/verify — Route publique. */
export async function verifyMagicLink(body: TokenDto): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>("/auth/magic-link/verify", body);
  return data;
}

/** POST /auth/email/verify — Route publique. */
export async function verifyEmail(body: TokenDto): Promise<{ success: true }> {
  const { data } = await apiClient.post<{ success: true }>("/auth/email/verify", body);
  return data;
}

/** GET /auth/me */
export async function me(): Promise<UserProfile & { roles: string[]; permissions: string[] }> {
  const { data } = await apiClient.get<UserProfile & { roles: string[]; permissions: string[] }>("/auth/me");
  return data;
}

/** POST /auth/logout */
export async function logout(): Promise<{ success: true }> {
  const { data } = await apiClient.post<{ success: true }>("/auth/logout", undefined);
  return data;
}

/** POST /auth/logout-all */
export async function logoutAll(): Promise<{ revoked: number }> {
  const { data } = await apiClient.post<{ revoked: number }>("/auth/logout-all", undefined);
  return data;
}

/** POST /auth/password/change */
export async function changePassword(body: ChangePasswordDto): Promise<{ success: true }> {
  const { data } = await apiClient.post<{ success: true }>("/auth/password/change", body);
  return data;
}

/** POST /auth/2fa/enable */
export async function enableTwoFactor(): Promise<{ secret: string; otpauth_url: string }> {
  const { data } = await apiClient.post<{ secret: string; otpauth_url: string }>("/auth/2fa/enable", undefined);
  return data;
}

/** POST /auth/2fa/confirm */
export async function confirmTwoFactor(body: TwoFactorCodeDto): Promise<{ two_factor_enabled: true }> {
  const { data } = await apiClient.post<{ two_factor_enabled: true }>("/auth/2fa/confirm", body);
  return data;
}

/** POST /auth/2fa/disable */
export async function disableTwoFactor(body: TwoFactorCodeDto): Promise<{ two_factor_enabled: false }> {
  const { data } = await apiClient.post<{ two_factor_enabled: false }>("/auth/2fa/disable", body);
  return data;
}
