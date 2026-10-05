import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { AuditableEntity } from '../../base-entities/embeddables/auditable.entity';

export type CampaignAnalyticDocument = HydratedDocument<CampaignAnalytic>;

/** Type d'événement de campagne suivi. */
export enum CampaignEvent {
  OPEN = 'open',
  CLICK = 'click',
  CONVERSION = 'conversion',
}

/**
 * Événement de campagne (ouverture, clic, conversion) enregistré pour analytics.
 */
@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'campaign_analytics',
})
export class CampaignAnalytic extends AuditableEntity {
  @Prop({ type: Types.ObjectId, ref: 'Campaign', required: true, index: true })
  campaign_id!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Guest', index: true })
  guest_id?: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(CampaignEvent),
    required: true,
    index: true,
  })
  event!: CampaignEvent;

  @Prop({ type: String, maxlength: 500 })
  link?: string;

  @Prop({ type: String, maxlength: 45 })
  ip?: string;

  @Prop({ type: Object, default: () => ({}) })
  metadata!: Record<string, any>;
}

export const CampaignAnalyticSchema =
  SchemaFactory.createForClass(CampaignAnalytic);

CampaignAnalyticSchema.index({ campaign_id: 1, event: 1 });
