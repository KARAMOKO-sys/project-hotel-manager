export interface SiteConfig {
  brandName: string;
  tagline: string;
  primaryColor: string;
  primaryHoverColor: string;
  hero: {
    eyebrow: string;
    title: string;
    highlight: string;
    description: string;
    imageUrl: string;
    ctaLabel: string;
  };
  about: {
    title: string;
    description: string;
    imageUrl: string;
  };
  callToAction: {
    title: string;
    description: string;
    imageUrl: string;
    buttonLabel: string;
  };
  sections: {
    categories: boolean;
    about: boolean;
    properties: boolean;
    callToAction: boolean;
    team: boolean;
    testimonials: boolean;
  };
}

export interface SiteConfigResponse {
  config: SiteConfig;
  updated_at: string | null;
}

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

/** Apparence du back-office (couleurs et paramètres d'affichage). */
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
  /** Arrondi des cartes et boutons, en pixels (0 à 24). */
  borderRadius: number;
  /** Taille du texte, en pourcentage (85 à 120). */
  fontScale: number;
  sidebarCollapsedByDefault: boolean;
}

export interface BackofficeThemeResponse {
  theme: BackofficeTheme;
  updated_at: string | null;
}

export const DEFAULT_BACKOFFICE_THEME: BackofficeTheme = {
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
