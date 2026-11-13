import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
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
}
