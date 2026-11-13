"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { siteConfigService } from "@/services/api";
import type { SiteConfig } from "@/types/site-config";

export const DEFAULT_SITE_CONFIG: SiteConfig = {
  brandName: "PleasantStay",
  tagline: "L'hospitalité, repensée",
  primaryColor: "#22c55e",
  primaryHoverColor: "#16a34a",
  hero: {
    eyebrow: "Bienvenue chez PleasantStay",
    title: "Trouvez le séjour",
    highlight: "qui vous ressemble",
    description:
      "Découvrez des établissements sélectionnés et réservez votre prochaine expérience en toute simplicité.",
    imageUrl: "/img/carousel-1.jpg",
    ctaLabel: "Découvrir nos propriétés",
  },
  about: {
    title: "Un séjour pensé autour de vous",
    description:
      "Notre équipe sélectionne des hébergements de qualité et vous accompagne à chaque étape de votre séjour.",
    imageUrl: "/img/about.jpg",
  },
  callToAction: {
    title: "Préparons ensemble votre prochain séjour",
    description:
      "Notre équipe est à votre écoute pour répondre à vos questions et vous aider à choisir.",
    imageUrl: "/img/call-to-action.jpg",
    buttonLabel: "Nous contacter",
  },
  sections: {
    categories: true,
    about: true,
    properties: true,
    callToAction: true,
    team: true,
    testimonials: true,
  },
};

interface SiteConfigContextValue {
  config: SiteConfig;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const SiteConfigContext = createContext<SiteConfigContextValue | null>(null);

export function SiteConfigProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [config, setConfig] = useState(DEFAULT_SITE_CONFIG);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await siteConfigService.getPublic();
      setConfig(response.config);
      setError(null);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "La configuration du site est indisponible.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--primary-color",
      config.primaryColor,
    );
    document.documentElement.style.setProperty(
      "--primary-color-hover",
      config.primaryHoverColor,
    );
    document.documentElement.style.setProperty(
      "--primary-dark",
      config.primaryHoverColor,
    );
    document.documentElement.style.setProperty(
      "--success-color",
      config.primaryColor,
    );
    document.documentElement.style.setProperty(
      "--success-dark",
      config.primaryHoverColor,
    );
    document.title = `${config.brandName} — ${config.tagline}`;
  }, [
    config.brandName,
    config.primaryColor,
    config.primaryHoverColor,
    config.tagline,
  ]);

  const value = useMemo(
    () => ({ config, loading, error, refresh }),
    [config, loading, error, refresh],
  );

  return (
    <SiteConfigContext.Provider value={value}>
      {children}
    </SiteConfigContext.Provider>
  );
}

export function useSiteConfig() {
  const value = useContext(SiteConfigContext);
  if (!value) {
    throw new Error("useSiteConfig doit être utilisé dans SiteConfigProvider");
  }
  return value;
}
