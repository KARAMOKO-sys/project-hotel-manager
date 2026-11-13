// =============================================================================
// Client HTTP de l'API backend PleasantStay (NestJS)
// =============================================================================
//
// - Ajoute le jeton `Authorization: Bearer` à chaque requête ;
// - rafraîchit automatiquement le jeton d'accès expiré (une seule fois par
//   requête, et un seul appel /auth/refresh pour les requêtes concurrentes) ;
// - normalise les erreurs en `ApiError` (statut HTTP + messages du serveur).

import axios, {
  AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";

/**
 * URL de base du backend, préfixe global `/api` inclus.
 * Le backend écoute par défaut sur le port 3000, comme `next dev` : lancez
 * l'un des deux sur un autre port et renseignez cette variable.
 */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_API_URL || "http://localhost:3000/api";

// -----------------------------------------------------------------------------
// Stockage des jetons
// -----------------------------------------------------------------------------

/** Cookie lu par `middleware.ts` pour protéger les routes privées. */
const ACCESS_COOKIE = "makaan_access_token";
const REFRESH_COOKIE = "makaan_refresh_token";
/** Durée de vie du refresh token côté backend (JWT_REFRESH_EXPIRES_IN). */
const REFRESH_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=")[1]) : null;
}

function writeCookie(name: string, value: string, maxAgeSeconds: number) {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax${secure}`;
}

export interface StoredTokens {
  access_token: string;
  refresh_token: string;
  /** Durée de vie du jeton d'accès en secondes. */
  expires_in: number;
}

export const tokenStorage = {
  getAccessToken: () => readCookie(ACCESS_COOKIE),
  getRefreshToken: () => readCookie(REFRESH_COOKIE),
  save(tokens: StoredTokens) {
    // Le cookie d'accès vit aussi longtemps que la session : le middleware
    // l'utilise comme indicateur de connexion, le client le rafraîchit.
    writeCookie(ACCESS_COOKIE, tokens.access_token, REFRESH_MAX_AGE_SECONDS);
    writeCookie(REFRESH_COOKIE, tokens.refresh_token, REFRESH_MAX_AGE_SECONDS);
  },
  clear() {
    writeCookie(ACCESS_COOKIE, "", 0);
    writeCookie(REFRESH_COOKIE, "", 0);
  },
};

// -----------------------------------------------------------------------------
// Erreurs
// -----------------------------------------------------------------------------

/** Erreur renvoyée par le backend (format NestJS `{ statusCode, message }`). */
export class ApiError extends Error {
  constructor(
    message: string,
    /** Statut HTTP (0 si le serveur est injoignable). */
    readonly status: number,
    /** Messages détaillés (ex. erreurs de validation class-validator). */
    readonly messages: string[] = [message],
    readonly data?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface NestErrorBody {
  message?: string | string[];
  error?: string;
}

function toApiError(error: AxiosError<NestErrorBody>): ApiError {
  if (!error.response) {
    return new ApiError("Serveur injoignable. Vérifiez votre connexion.", 0);
  }
  const body = error.response.data;
  const raw = body?.message ?? body?.error ?? error.message;
  const messages = Array.isArray(raw) ? raw : [raw];
  return new ApiError(messages.join("\n"), error.response.status, messages, body);
}

// -----------------------------------------------------------------------------
// Instance axios
// -----------------------------------------------------------------------------

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
});

apiClient.interceptors.request.use((config) => {
  const token = tokenStorage.getAccessToken();
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/** Routes pour lesquelles un 401 ne doit pas déclencher de rafraîchissement. */
const NO_REFRESH_ROUTES = ["/auth/login", "/auth/refresh", "/auth/2fa/verify", "/auth/register"];

let refreshPromise: Promise<string | null> | null = null;

/** Échange le refresh token contre un nouveau couple de jetons. */
async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = tokenStorage.getRefreshToken();
  if (!refreshToken) return null;
  try {
    // Appel direct (sans intercepteurs) pour éviter toute boucle.
    const { data } = await axios.post<StoredTokens>(
      `${API_BASE_URL}/auth/refresh`,
      { refresh_token: refreshToken },
    );
    tokenStorage.save(data);
    return data.access_token;
  } catch {
    tokenStorage.clear();
    return null;
  }
}

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<NestErrorBody>) => {
    const config = error.config as RetriableConfig | undefined;
    const canRefresh =
      error.response?.status === 401 &&
      config &&
      !config._retried &&
      !NO_REFRESH_ROUTES.some((route) => config.url?.startsWith(route));

    if (canRefresh) {
      config._retried = true;
      refreshPromise ??= refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
      const token = await refreshPromise;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        return apiClient.request(config as AxiosRequestConfig);
      }
    }
    return Promise.reject(toApiError(error));
  },
);
