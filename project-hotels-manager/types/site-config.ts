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
