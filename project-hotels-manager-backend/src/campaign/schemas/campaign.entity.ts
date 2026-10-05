import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { AuditableEntity } from '../../base-entities/embeddables/auditable.entity';
import { CampaignStatus } from '../../base-entities/enums/campaign-status.enum';
import { CampaignType } from '../../base-entities/enums/campaign-type.enum';

export type CampaignDocument = HydratedDocument<Campaign>;

/**
 * Campagne marketing (email, SMS, push, offre).
 */
@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'campaigns',
})
export class Campaign extends AuditableEntity {
  @Prop({ type: Types.ObjectId, ref: 'Property', index: true })
  property_id?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'GuestSegment', index: true })
  segment_id?: Types.ObjectId;

  @Prop({
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
    index: true,
  })
  name!: string;

  @Prop({
    type: String,
    enum: Object.values(CampaignType),
    default: CampaignType.EMAIL,
  })
  type!: CampaignType;

  @Prop({
    type: String,
    enum: Object.values(CampaignStatus),
    default: CampaignStatus.DRAFT,
    index: true,
  })
  status!: CampaignStatus;

  @Prop({ type: String, maxlength: 255 })
  subject?: string;

  @Prop({ type: String })
  content?: string;

  @Prop({ type: Date })
  scheduled_at?: Date;

  @Prop({ type: Date })
  sent_at?: Date;

  @Prop({ type: Number, min: 0, default: 0 })
  recipient_count!: number;

  @Prop({ type: Object, default: () => ({}) })
  metadata!: Record<string, any>;
}

export const CampaignSchema = SchemaFactory.createForClass(Campaign);

CampaignSchema.index({ property_id: 1, status: 1 });
CampaignSchema.index({ scheduled_at: 1 });
