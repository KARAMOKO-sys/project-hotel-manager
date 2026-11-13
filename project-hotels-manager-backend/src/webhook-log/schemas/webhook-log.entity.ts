import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types, SchemaTypes } from 'mongoose';
import { AuditableEntity } from '../../base-entities/embeddables/auditable.entity';

export type WebhookLogDocument = HydratedDocument<WebhookLog>;

/** Fournisseurs émetteurs de webhooks (paiement et OTA). */
export enum WebhookProvider {
  STRIPE = 'stripe',
  ORANGE_MONEY = 'orange_money',
  MTN_MOMO = 'mtn_momo',
  MOOV_MONEY = 'moov_money',
  WAVE = 'wave',
  BOOKING = 'booking',
  EXPEDIA = 'expedia',
  AIRBNB = 'airbnb',
  AGODA = 'agoda',
  OTHER = 'other',
}

/** Statut de traitement d'un webhook reçu. */
export enum WebhookStatus {
  RECEIVED = 'received',
  PROCESSING = 'processing',
  PROCESSED = 'processed',
  FAILED = 'failed',
  IGNORED = 'ignored',
}

/**
 * Journal des webhooks entrants : conserve la charge utile brute, le résultat
 * de la vérification de signature et l'état de traitement (avec renvois).
 */
@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'webhook_logs',
})
export class WebhookLog extends AuditableEntity {
  @Prop({
    type: String,
    enum: Object.values(WebhookProvider),
    required: true,
    index: true,
  })
  provider!: WebhookProvider;

  /** Type d'événement (ex : payment_intent.succeeded, reservation.created). */
  @Prop({ type: String, required: true, trim: true, maxlength: 150 })
  event_type!: string;

  /** Identifiant de l'événement chez le fournisseur (idempotence). */
  @Prop({ type: String, trim: true, maxlength: 255 })
  event_id?: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Property', index: true })
  property_id?: Types.ObjectId;

  @Prop({ type: Object, required: true })
  payload!: Record<string, any>;

  @Prop({ type: Object, default: () => ({}) })
  headers!: Record<string, any>;

  @Prop({ type: String, maxlength: 2000 })
  signature?: string;

  @Prop({ type: Boolean, default: false })
  signature_verified!: boolean;

  @Prop({
    type: String,
    enum: Object.values(WebhookStatus),
    default: WebhookStatus.RECEIVED,
    index: true,
  })
  status!: WebhookStatus;

  /** Vrai si l'événement avait déjà été reçu (renvoi du fournisseur). */
  @Prop({ type: Boolean, default: false })
  is_duplicate!: boolean;

  @Prop({ type: Number, min: 0, default: 0 })
  attempts!: number;

  @Prop({ type: Number, min: 1, default: 5 })
  max_attempts!: number;

  @Prop({ type: Date, default: Date.now })
  received_at!: Date;

  @Prop({ type: Date })
  processed_at?: Date;

  @Prop({ type: Date })
  last_attempt_at?: Date;

  @Prop({ type: String, maxlength: 2000 })
  error_message?: string;

  /** Résultat du traitement (identifiant de paiement créé…). */
  @Prop({ type: Object })
  result?: Record<string, any>;

  @Prop({ type: String, trim: true, maxlength: 64 })
  ip_address?: string;

  @Prop({ type: String, trim: true, maxlength: 100 })
  related_entity_type?: string;

  @Prop({ type: SchemaTypes.ObjectId })
  related_entity_id?: Types.ObjectId;

  @Prop({ type: String, maxlength: 500 })
  notes?: string;
}

export const WebhookLogSchema = SchemaFactory.createForClass(WebhookLog);

WebhookLogSchema.index({ provider: 1, event_id: 1 });
WebhookLogSchema.index({ provider: 1, event_type: 1, received_at: -1 });
WebhookLogSchema.index({ status: 1, received_at: -1 });
