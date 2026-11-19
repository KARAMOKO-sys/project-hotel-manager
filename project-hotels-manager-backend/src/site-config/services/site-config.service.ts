import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  BackofficeTheme,
  BackofficeThemeResponse,
  DEFAULT_BACKOFFICE_THEME,
  DEFAULT_SITE_CONFIG,
  SiteConfig,
  SiteConfigResponse,
} from "../site-config.types";
import { SiteConfigRecord } from "../schemas/site-config.entity";

type PlainSiteConfigRecord = Pick<SiteConfigRecord, "config"> & {
  updated_at?: Date;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function requireText(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new BadRequestException(`${field} doit être une chaîne de caractères`);
  }
  return value.trim();
}

function requireColor(value: unknown, field: string): string {
  const color = requireText(value, field);
  if (!/^#[\da-f]{6}$/i.test(color)) {
    throw new BadRequestException(`${field} doit être une couleur hexadécimale`);
  }
  return color;
}

function requireImageUrl(value: unknown, field: string): string {
  const imageUrl = requireText(value, field);
  if (
    imageUrl &&
    !imageUrl.startsWith("/") &&
    !/^https:\/\/\S+$/i.test(imageUrl)
  ) {
    throw new BadRequestException(
      `${field} doit être une URL HTTPS ou un chemin local`,
    );
  }
  if (imageUrl.startsWith("//")) {
    throw new BadRequestException(`${field} doit être un chemin local valide`);
  }
  return imageUrl;
}

function requireSectionFlags(value: unknown): SiteConfig["sections"] {
  if (!isRecord(value)) {
    throw new BadRequestException("sections doit être un objet");
  }

  const keys = Object.keys(DEFAULT_SITE_CONFIG.sections) as Array<
    keyof SiteConfig["sections"]
  >;
  const sections = {} as SiteConfig["sections"];
  for (const key of keys) {
    if (typeof value[key] !== "boolean") {
      throw new BadRequestException(`sections.${key} doit être un booléen`);
    }
    sections[key] = value[key];
  }
  return sections;
}

function normalizeConfig(value: unknown): SiteConfig {
  if (!isRecord(value)) {
    throw new BadRequestException("config doit être un objet");
  }
  const hero = value.hero;
  const about = value.about;
  const callToAction = value.callToAction;
  if (!isRecord(hero) || !isRecord(about) || !isRecord(callToAction)) {
    throw new BadRequestException(
      "config doit contenir les objets hero, about et callToAction",
    );
  }

  return {
    brandName: requireText(value.brandName, "brandName"),
    tagline: requireText(value.tagline, "tagline"),
    primaryColor: requireColor(value.primaryColor, "primaryColor"),
    primaryHoverColor: requireColor(
      value.primaryHoverColor,
      "primaryHoverColor",
    ),
    hero: {
      eyebrow: requireText(hero.eyebrow, "hero.eyebrow"),
      title: requireText(hero.title, "hero.title"),
      highlight: requireText(hero.highlight, "hero.highlight"),
      description: requireText(hero.description, "hero.description"),
      imageUrl: requireImageUrl(hero.imageUrl, "hero.imageUrl"),
      ctaLabel: requireText(hero.ctaLabel, "hero.ctaLabel"),
    },
    about: {
      title: requireText(about.title, "about.title"),
      description: requireText(about.description, "about.description"),
      imageUrl: requireImageUrl(about.imageUrl, "about.imageUrl"),
    },
    callToAction: {
      title: requireText(callToAction.title, "callToAction.title"),
      description: requireText(
        callToAction.description,
        "callToAction.description",
      ),
      imageUrl: requireImageUrl(
        callToAction.imageUrl,
        "callToAction.imageUrl",
      ),
      buttonLabel: requireText(
        callToAction.buttonLabel,
        "callToAction.buttonLabel",
      ),
    },
    sections: requireSectionFlags(value.sections),
  };
}

const THEME_KEY = "backoffice_theme";
const THEME_COLORS = [
  "primaryColor",
  "primaryHoverColor",
  "pageBackground",
  "surfaceColor",
  "textColor",
  "sidebarBackground",
  "sidebarTextColor",
  "headerBackground",
  "loginGradientStart",
  "loginGradientEnd",
] as const;

function requireNumber(
  value: unknown,
  field: string,
  min: number,
  max: number,
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new BadRequestException(`${field} doit être un nombre`);
  }
  if (value < min || value > max) {
    throw new BadRequestException(`${field} doit être entre ${min} et ${max}`);
  }
  return Math.round(value);
}

/**
 * Valide un thème partiel et le complète avec les valeurs actuelles : seuls
 * les champs envoyés sont modifiés.
 */
function normalizeTheme(
  value: unknown,
  current: BackofficeTheme,
): BackofficeTheme {
  if (!isRecord(value)) {
    throw new BadRequestException("theme doit être un objet");
  }
  const theme: BackofficeTheme = { ...current };
  for (const field of THEME_COLORS) {
    if (value[field] !== undefined) {
      theme[field] = requireColor(value[field], field);
    }
  }
  if (value.appName !== undefined) {
    theme.appName = requireText(value.appName, "appName").slice(0, 60);
    if (!theme.appName) {
      throw new BadRequestException("appName ne peut pas être vide");
    }
  }
  if (value.appSubtitle !== undefined) {
    theme.appSubtitle = requireText(value.appSubtitle, "appSubtitle").slice(
      0,
      60,
    );
  }
  if (value.logoUrl !== undefined) {
    theme.logoUrl = requireImageUrl(value.logoUrl, "logoUrl");
  }
  if (value.borderRadius !== undefined) {
    theme.borderRadius = requireNumber(value.borderRadius, "borderRadius", 0, 24);
  }
  if (value.fontScale !== undefined) {
    theme.fontScale = requireNumber(value.fontScale, "fontScale", 85, 120);
  }
  if (value.sidebarCollapsedByDefault !== undefined) {
    if (typeof value.sidebarCollapsedByDefault !== "boolean") {
      throw new BadRequestException(
        "sidebarCollapsedByDefault doit être un booléen",
      );
    }
    theme.sidebarCollapsedByDefault = value.sidebarCollapsedByDefault;
  }
  return theme;
}

@Injectable()
export class SiteConfigService {
  constructor(
    @InjectModel(SiteConfigRecord.name)
    private readonly siteConfigModel: Model<SiteConfigRecord>,
  ) {}

  async findPublic(): Promise<SiteConfigResponse> {
    const record = (await this.siteConfigModel
      .findOne({ key: "default" })
      .lean()
      .exec()) as PlainSiteConfigRecord | null;

    return {
      config: record?.config ?? DEFAULT_SITE_CONFIG,
      updated_at: record?.updated_at?.toISOString() ?? null,
    };
  }

  async update(config: unknown): Promise<SiteConfigResponse> {
    const normalized = normalizeConfig(config);
    const record = (await this.siteConfigModel
      .findOneAndUpdate(
        { key: "default" },
        { $set: { config: normalized } },
        {
          new: true,
          upsert: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        },
      )
      .lean()
      .exec()) as PlainSiteConfigRecord | null;

    if (!record) {
      throw new InternalServerErrorException(
        "La configuration du site n'a pas pu être sauvegardée",
      );
    }
    return {
      config: record.config,
      updated_at: record.updated_at?.toISOString() ?? null,
    };
  }

  /** Thème du back-office (valeurs par défaut pour les champs absents). */
  async findTheme(): Promise<BackofficeThemeResponse> {
    const record = (await this.siteConfigModel
      .findOne({ key: THEME_KEY })
      .lean()
      .exec()) as { config?: unknown; updated_at?: Date } | null;
    return {
      theme: {
        ...DEFAULT_BACKOFFICE_THEME,
        ...((record?.config as Partial<BackofficeTheme>) ?? {}),
      },
      updated_at: record?.updated_at?.toISOString() ?? null,
    };
  }

  /** Met à jour le thème ; `reset` restaure les valeurs par défaut. */
  async updateTheme(
    value: unknown,
    reset = false,
  ): Promise<BackofficeThemeResponse> {
    const current = reset
      ? DEFAULT_BACKOFFICE_THEME
      : (await this.findTheme()).theme;
    const theme = normalizeTheme(value ?? {}, current);
    const record = (await this.siteConfigModel
      .findOneAndUpdate(
        { key: THEME_KEY },
        { $set: { config: theme } },
        { new: true, upsert: true },
      )
      .lean()
      .exec()) as { config?: unknown; updated_at?: Date } | null;
    return {
      theme: (record?.config as BackofficeTheme) ?? theme,
      updated_at: record?.updated_at?.toISOString() ?? null,
    };
  }
}
