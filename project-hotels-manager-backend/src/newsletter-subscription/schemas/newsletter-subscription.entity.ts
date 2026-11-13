import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { AuditableEntity } from '../../base-entities/embeddables/auditable.entity';

export type NewsletterSubscriptionDocument =
  HydratedDocument<NewsletterSubscription>;

/** Inscription à la newsletter depuis le site public. */
@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'newsletter_subscriptions',
})
export class NewsletterSubscription extends AuditableEntity {
  @Prop({
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    maxlength: 255,
    unique: true,
  })
  email!: string;

  @Prop({ type: Boolean, default: true })
  is_active!: boolean;

  @Prop({ type: Date })
  unsubscribed_at?: Date;
}

export const NewsletterSubscriptionSchema = SchemaFactory.createForClass(
  NewsletterSubscription,
);
