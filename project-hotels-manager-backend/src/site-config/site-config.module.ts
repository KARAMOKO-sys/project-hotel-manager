import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { SiteConfigController } from "./controllers/site-config.controller";
import {
  SiteConfigRecord,
  SiteConfigSchema,
} from "./schemas/site-config.entity";
import { SiteConfigService } from "./services/site-config.service";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SiteConfigRecord.name, schema: SiteConfigSchema },
    ]),
  ],
  controllers: [SiteConfigController],
  providers: [SiteConfigService],
  exports: [SiteConfigService],
})
export class SiteConfigModule {}
