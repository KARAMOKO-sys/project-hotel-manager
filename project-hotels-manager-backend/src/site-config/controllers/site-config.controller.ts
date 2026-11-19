import { Body, Controller, Get, Patch, Post } from "@nestjs/common";
import { Roles } from "../../auth/decorators/roles.decorator";
import { Public } from "../../auth/decorators/public.decorator";
import { UserType } from "../../base-entities/enums/user-type.enum";
import { UpdateSiteConfigDto } from "../dto/update-site-config.dto";
import { UpdateBackofficeThemeDto } from "../dto/update-backoffice-theme.dto";
import { SiteConfigService } from "../services/site-config.service";

@Controller("site-config")
export class SiteConfigController {
  constructor(private readonly siteConfigService: SiteConfigService) {}

  @Public()
  @Get()
  findPublic() {
    return this.siteConfigService.findPublic();
  }

  @Roles(UserType.SUPER_ADMIN)
  @Patch()
  update(@Body() dto: UpdateSiteConfigDto) {
    return this.siteConfigService.update(dto.config);
  }

  /** Thème du back-office, lu avant la connexion (page de login). */
  @Public()
  @Get("theme")
  findTheme() {
    return this.siteConfigService.findTheme();
  }

  @Roles(UserType.SUPER_ADMIN, UserType.OWNER)
  @Patch("theme")
  updateTheme(@Body() dto: UpdateBackofficeThemeDto) {
    return this.siteConfigService.updateTheme(dto.theme);
  }

  @Roles(UserType.SUPER_ADMIN, UserType.OWNER)
  @Post("theme/reset")
  resetTheme() {
    return this.siteConfigService.updateTheme({}, true);
  }
}
