// src/lib/config.ts
// Configuration globale de l'application (exposée côté client).

export const API_BASE_URL =
  (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api").replace(
    /\/+$/,
    "",
  );
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export const APP_NAME = "PleasantStay";
export const APP_TAGLINE = "Backoffice hôtelier";
