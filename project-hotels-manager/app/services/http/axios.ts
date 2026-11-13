// =============================================================================
// Client HTTP vers le backend (PleasantStay API)
// =============================================================================

import axios, { AxiosError } from "axios";

/** URL de base de l'API NestJS (préfixe global `/api`). */
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

export const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
});

/**
 * Normalise les erreurs : `error.message` contient le message du backend.
 * Les erreurs de validation NestJS renvoient `message` sous forme de tableau.
 */
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string | string[] }>) => {
    const serverMessage = error.response?.data?.message;
    const message = Array.isArray(serverMessage)
      ? serverMessage.join(" ")
      : serverMessage;

    return Promise.reject(
      new Error(
        message ||
          (error.response
            ? error.message
            : "Le serveur est injoignable. Veuillez réessayer plus tard."),
      ),
    );
  },
);
