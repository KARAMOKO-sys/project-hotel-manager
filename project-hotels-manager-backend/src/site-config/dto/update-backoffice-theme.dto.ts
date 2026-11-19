import { IsObject } from "class-validator";
import type { BackofficeTheme } from "../site-config.types";

export class UpdateBackofficeThemeDto {
  @IsObject()
  theme!: Partial<BackofficeTheme>;
}
