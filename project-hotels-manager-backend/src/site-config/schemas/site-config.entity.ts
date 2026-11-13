import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, SchemaTypes } from "mongoose";
import type { SiteConfig } from "../site-config.types";

export type SiteConfigDocument = HydratedDocument<SiteConfigRecord>;

@Schema({
  timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  collection: "site_configs",
})
export class SiteConfigRecord {
  @Prop({ type: String, required: true, unique: true, default: "default" })
  key!: string;

  @Prop({ type: SchemaTypes.Mixed, required: true })
  config!: SiteConfig;
}

export const SiteConfigSchema = SchemaFactory.createForClass(SiteConfigRecord);
