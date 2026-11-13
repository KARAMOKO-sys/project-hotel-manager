import { Body, Controller, Get, Patch } from "@nestjs/common";
import { Roles } from "../../auth/decorators/roles.decorator";
import { Public } from "../../auth/decorators/public.decorator";
import { UserType } from "../../base-entities/enums/user-type.enum";
import { UpdateSiteConfigDto } from "../dto/update-site-config.dto";
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
}
