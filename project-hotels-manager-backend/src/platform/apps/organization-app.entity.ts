import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

export type OrganizationAppDocument = HydratedDocument<OrganizationApp>;

export enum AppState {
  INSTALLED = 'installed',
  UNINSTALLED = 'uninstalled',
}

/** État d'une application pour une organisation. */
@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'organization_apps',
})
export class OrganizationApp {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Organization', required: true })
  organization_id!: Types.ObjectId;

  @Prop({ type: String, required: true, maxlength: 60 })
  app_key!: string;

  @Prop({ type: String, enum: Object.values(AppState), required: true })
  state!: AppState;

  @Prop({ type: Date })
  installed_at?: Date;

  @Prop({ type: Date })
  uninstalled_at?: Date;

  @Prop({ type: String })
  changed_by?: string;

  /** Paramètres propres à l'application pour cette organisation. */
  @Prop({ type: Object, default: () => ({}) })
  settings!: Record<string, unknown>;
}

export const OrganizationAppSchema =
  SchemaFactory.createForClass(OrganizationApp);
OrganizationAppSchema.index(
  { organization_id: 1, app_key: 1 },
  { unique: true },
);
