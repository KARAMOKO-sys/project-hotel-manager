import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types, SchemaTypes } from 'mongoose';
import { AuditableEntity } from '../../base-entities/embeddables/auditable.entity';
import { NotificationChannel } from '../../base-entities/enums/notification-channel.enum';

export type NotificationLogDocument = HydratedDocument<NotificationLog>;

/** Statut d'acheminement d'une notification. */
export enum NotificationStatus {
  QUEUED = 'queued',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
}

/** Type de destinataire. */
export enum NotificationRecipientType {
  USER = 'user',
  GUEST = 'guest',
  PARTNER = 'partner',
  OTHER = 'other',
}

/**
 * Journal d'une notification envoyée (email, SMS, push, in-app) avec suivi
 * du statut d'acheminement et des tentatives de renvoi.
 */
@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'notification_logs',
})
export class NotificationLog extends AuditableEntity {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Property', index: true })
  property_id?: Types.ObjectId;

  /** Identifiant du destinataire (utilisateur, client…). */
  @Prop({ type: SchemaTypes.ObjectId, index: true })
  recipient_id?: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(NotificationRecipientType),
    default: NotificationRecipientType.USER,
  })
  recipient_type!: NotificationRecipientType;

  /** Adresse technique : email, numéro de téléphone, jeton push… */
  @Prop({ type: String, trim: true, maxlength: 320, index: true })
  recipient_address?: string;

  @Prop({
    type: String,
    enum: Object.values(NotificationChannel),
    required: true,
    index: true,
  })
  channel!: NotificationChannel;

  /** Modèle utilisé (ex : reservation_confirmation). */
  @Prop({ type: String, trim: true, maxlength: 100, index: true })
  template?: string;

  @Prop({ type: String, trim: true, maxlength: 255 })
  subject?: string;

  @Prop({ type: String, maxlength: 10000 })
  body?: string;

  @Prop({
    type: String,
    enum: Object.values(NotificationStatus),
    default: NotificationStatus.QUEUED,
    index: true,
  })
  status!: NotificationStatus;

  /** Fournisseur d'envoi (sendgrid, twilio, fcm…). */
  @Prop({ type: String, trim: true, maxlength: 50 })
  provider?: string;

  @Prop({ type: String, trim: true, maxlength: 255 })
  provider_message_id?: string;

  @Prop({ type: String, maxlength: 1000 })
  error_message?: string;

  @Prop({ type: Number, min: 0, default: 0 })
  retry_count!: number;

  @Prop({ type: Number, min: 0, default: 3 })
  max_retries!: number;

  @Prop({ type: Date, index: true })
  next_retry_at?: Date;

  @Prop({ type: Date })
  sent_at?: Date;

  @Prop({ type: Date })
  delivered_at?: Date;

  @Prop({ type: Date })
  read_at?: Date;

  @Prop({ type: Date })
  failed_at?: Date;

  /** Entité métier liée (ex : Reservation). */
  @Prop({ type: String, trim: true, maxlength: 100 })
  related_entity_type?: string;

  @Prop({ type: SchemaTypes.ObjectId })
  related_entity_id?: Types.ObjectId;

  @Prop({ type: Object, default: () => ({}) })
  metadata!: Record<string, any>;
}

export const NotificationLogSchema =
  SchemaFactory.createForClass(NotificationLog);

NotificationLogSchema.index({ recipient_id: 1, created_at: -1 });
NotificationLogSchema.index({ status: 1, next_retry_at: 1 });
NotificationLogSchema.index({ property_id: 1, channel: 1, created_at: -1 });
NotificationLogSchema.index({ related_entity_type: 1, related_entity_id: 1 });
