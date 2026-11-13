import { IsObject } from "class-validator";
import type { SiteConfig } from "../site-config.types";

export class UpdateSiteConfigDto {
  @IsObject()
  config!: SiteConfig;
}
