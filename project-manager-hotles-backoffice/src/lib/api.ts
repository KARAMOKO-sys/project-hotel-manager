// src/lib/api.ts
// Client HTTP typé vers l'API NestJS (préfixe /api).

import { API_BASE_URL } from "./config";
import type { Entity, PaginatedResult } from "./types";

export type QueryValue = string | number | boolean | undefined | null;

const ACCESS_TOKEN_KEY = "pleasantstay.access_token";
const REFRESH_TOKEN_KEY = "pleasantstay.refresh_token";
const USER_KEY = "pleasantstay.user";

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  user: Record<string, unknown>;
}

export function saveAuthSession(session: AuthSession): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(ACCESS_TOKEN_KEY, session.access_token);
  window.sessionStorage.setItem(REFRESH_TOKEN_KEY, session.refresh_token);
  window.sessionStorage.setItem(USER_KEY, JSON.stringify(session.user));
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getAuthUser(): Record<string, unknown> | null {
  if (typeof window === "undefined") return null;
  const stored = window.sessionStorage.getItem(USER_KEY);
  if (!stored) return null;

  try {
    const user: unknown = JSON.parse(stored);
    return user && typeof user === "object" && !Array.isArray(user)
      ? (user as Record<string, unknown>)
      : null;
  } catch {
    window.sessionStorage.removeItem(USER_KEY);
    return null;
  }
}

export function clearAuthSession(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  window.sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  window.sessionStorage.removeItem(USER_KEY);
}

function expireAuthSession(): void {
  clearAuthSession();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("auth:unauthorized"));
  }
}

async function refreshAccessToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const refreshToken = window.sessionStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) return null;

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  } catch {
    expireAuthSession();
    return null;
  }

  if (!response.ok) {
    expireAuthSession();
    return null;
  }

  try {
    const result = (await response.json()) as Partial<AuthSession>;
    if (
      typeof result.access_token !== "string" ||
      typeof result.refresh_token !== "string"
    ) {
      expireAuthSession();
      return null;
    }
    saveAuthSession({
      access_token: result.access_token,
      refresh_token: result.refresh_token,
      user: result.user ?? getAuthUser() ?? {},
    });
    return result.access_token;
  } catch {
    expireAuthSession();
    return null;
  }
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function buildQuery(params?: Record<string, QueryValue>): string {
  if (!params) return "";
  const entries = Object.entries(params).filter(
    ([, value]) => value !== undefined && value !== null && value !== "",
  );
  if (entries.length === 0) return "";
  const qs = entries
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`,
    )
    .join("&");
  return `?${qs}`;
}

/** Requête générique vers l'API, avec gestion d'erreur normalisée. */
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const token = getAuthToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let res: Response;
  try {
    res = await fetch(url, { ...options, headers });
  } catch {
    throw new ApiError("Impossible de joindre le serveur", 0);
  }

  if (res.status === 401 && token && path !== "/auth/refresh") {
    const refreshedToken = await refreshAccessToken();
    if (refreshedToken) {
      headers.set("Authorization", `Bearer ${refreshedToken}`);
      try {
        res = await fetch(url, { ...options, headers });
      } catch {
        throw new ApiError("Impossible de joindre le serveur", 0);
      }
    }
  }

  if (!res.ok) {
    if (res.status === 401 && getAuthToken()) {
      expireAuthSession();
    }

    let message = `Erreur ${res.status}`;
    try {
      const body = (await res.json()) as {
        message?: string | string[];
        error?: string;
      };
      const candidate = body.message ?? body.error;
      if (typeof candidate === "string") message = candidate;
      else if (Array.isArray(candidate)) message = candidate.join(", ");
    } catch {
      // Corps non-JSON, on garde le message par défaut.
    }
    throw new ApiError(message, res.status);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  list: <T extends Entity>(
    path: string,
    params?: Record<string, QueryValue>,
  ) => apiFetch<PaginatedResult<T>>(`${path}${buildQuery(params)}`),

  get: <T>(path: string) => apiFetch<T>(path),

  create: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: "POST", body: JSON.stringify(body) }),

  update: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: "PATCH", body: JSON.stringify(body) }),

  remove: <T>(path: string) => apiFetch<T>(path, { method: "DELETE" }),
};
