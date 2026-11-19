"use client";

// Thème du back-office : couleurs et paramètres d'affichage enregistrés côté
// API (GET/PATCH /site-config/theme) et appliqués en variables CSS (--ps-*).

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiFetch } from "./api";

export interface BackofficeTheme {
  appName: string;
  appSubtitle: string;
  logoUrl: string;
  primaryColor: string;
  primaryHoverColor: string;
  pageBackground: string;
  surfaceColor: string;
  textColor: string;
  sidebarBackground: string;
  sidebarTextColor: string;
  headerBackground: string;
  loginGradientStart: string;
  loginGradientEnd: string;
  borderRadius: number;
  fontScale: number;
  sidebarCollapsedByDefault: boolean;
}

interface ThemeResponse {
  theme: BackofficeTheme;
  updated_at: string | null;
}

export const DEFAULT_THEME: BackofficeTheme = {
  appName: "PleasantStay",
  appSubtitle: "Hotel Admin",
  logoUrl: "",
  primaryColor: "#22c55e",
  primaryHoverColor: "#16a34a",
  pageBackground: "#ffffff",
  surfaceColor: "#ffffff",
  textColor: "#1f2937",
  sidebarBackground: "#ffffff",
  sidebarTextColor: "#1f2937",
  headerBackground: "#ffffff",
  loginGradientStart: "#0f5132",
  loginGradientEnd: "#22a05b",
  borderRadius: 16,
  fontScale: 100,
  sidebarCollapsedByDefault: false,
};

const CACHE_KEY = "pleasantstay.backoffice_theme";

function hexToRgb(hex: string): string {
  const value = hex.replace("#", "");
  const n = parseInt(value.length === 3 ? value.replace(/./g, "$&$&") : value, 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

/** Applique le thème au document (variables CSS sur <html>). */
export function applyTheme(theme: BackofficeTheme): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const vars: Record<string, string> = {
    "--ps-primary": theme.primaryColor,
    "--ps-primary-hover": theme.primaryHoverColor,
    "--ps-primary-rgb": hexToRgb(theme.primaryColor),
    "--ps-page-bg": theme.pageBackground,
    "--ps-surface": theme.surfaceColor,
    "--ps-text": theme.textColor,
    "--ps-sidebar-bg": theme.sidebarBackground,
    "--ps-sidebar-text": theme.sidebarTextColor,
    "--ps-header-bg": theme.headerBackground,
    "--ps-login-start": theme.loginGradientStart,
    "--ps-login-end": theme.loginGradientEnd,
    "--radius-sm": `${Math.round(theme.borderRadius * 0.33)}px`,
    "--radius-md": `${Math.round(theme.borderRadius * 0.5)}px`,
    "--radius-lg": `${Math.round(theme.borderRadius * 0.66)}px`,
    "--radius-xl": `${theme.borderRadius}px`,
    "--radius-2xl": `${Math.round(theme.borderRadius * 1.33)}px`,
  };
  Object.entries(vars).forEach(([name, value]) => root.style.setProperty(name, value));
  root.style.fontSize = `${theme.fontScale}%`;
}

function readCache(): BackofficeTheme | null {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    return raw ? { ...DEFAULT_THEME, ...(JSON.parse(raw) as Partial<BackofficeTheme>) } : null;
  } catch {
    return null;
  }
}

function writeCache(theme: BackofficeTheme): void {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(theme));
  } catch {
    // Stockage indisponible (navigation privée) : le thème reste appliqué.
  }
}

interface ThemeContextValue {
  theme: BackofficeTheme;
  loaded: boolean;
  /** Aperçu immédiat, sans enregistrer. */
  preview: (theme: BackofficeTheme) => void;
  save: (theme: BackofficeTheme) => Promise<void>;
  reset: () => Promise<void>;
  /** Revient au thème enregistré (annule l'aperçu). */
  revert: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [saved, setSaved] = useState<BackofficeTheme>(DEFAULT_THEME);
  const [theme, setTheme] = useState<BackofficeTheme>(DEFAULT_THEME);
  const [loaded, setLoaded] = useState(false);

  const commit = useCallback((next: BackofficeTheme) => {
    setSaved(next);
    setTheme(next);
    applyTheme(next);
    writeCache(next);
  }, []);

  useEffect(() => {
    // Le cache local (lu après l'hydratation) évite un flash de couleurs en
    // attendant la réponse de l'API.
    const cached = readCache();
    applyTheme(cached ?? DEFAULT_THEME);
    const timer = window.setTimeout(() => {
      if (cached) {
        setSaved(cached);
        setTheme(cached);
      }
    }, 0);
    apiFetch<ThemeResponse>("/site-config/theme")
      .then((response) => commit({ ...DEFAULT_THEME, ...response.theme }))
      .catch(() => undefined)
      .finally(() => setLoaded(true));
    return () => window.clearTimeout(timer);
  }, [commit]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      loaded,
      preview: (next) => {
        setTheme(next);
        applyTheme(next);
      },
      save: async (next) => {
        const response = await apiFetch<ThemeResponse>("/site-config/theme", {
          method: "PATCH",
          body: JSON.stringify({ theme: next }),
        });
        commit({ ...DEFAULT_THEME, ...response.theme });
      },
      reset: async () => {
        const response = await apiFetch<ThemeResponse>("/site-config/theme/reset", {
          method: "POST",
        });
        commit({ ...DEFAULT_THEME, ...response.theme });
      },
      revert: () => {
        setTheme(saved);
        applyTheme(saved);
      },
    }),
    [theme, loaded, saved, commit],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      theme: DEFAULT_THEME,
      loaded: true,
      preview: () => undefined,
      save: async () => undefined,
      reset: async () => undefined,
      revert: () => undefined,
    };
  }
  return context;
}
