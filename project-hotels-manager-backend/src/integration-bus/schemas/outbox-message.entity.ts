import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import {
  DEFAULT_MAX_ATTEMPTS,
  DELIVERED_TTL_SECONDS,
} from '../integration-bus.constants';
import type { OutboundEnvelope } from '../integration-bus.types';

export type OutboxMessageDocument = HydratedDocument<OutboxMessage>;

/**
 * Cycle de vie d'un message :
 * `pending → delivering → delivered`, ou retour en `pending` (nouvelle
 * tentative différée), `dead` (tentatives épuisées) ou `failed` (échec
 * définitif : point de terminaison supprimé/désactivé, 410, URL interdite).
 * `dead` et `failed` peuvent être relancés manuellement.
 */
export enum OutboxStatus {
  PENDING = 'pending',
  DELIVERING = 'delivering',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  DEAD = 'dead',
}

/**
 * Boîte d'envoi de l'ESB (pattern outbox) : une ligne par couple
 * (événement, point de terminaison), insérée pendant la requête métier et
 * livrée en arrière-plan par le répartiteur.
 *
 * Document technique à forte volumétrie : pas de suppression logique ;
 * les messages livrés sont purgés après 30 jours (index TTL).
 */
@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'integration_outbox',
})
export class OutboxMessage {
  _id!: Types.ObjectId;

  /** Identifiant de l'événement métier (clé d'idempotence). */
  @Prop({ type: String, required: true, maxlength: 100 })
  event_id!: string;

  @Prop({ type: String, required: true, maxlength: 150, index: true })
  event_name!: string;

  /** Sujet fourni par l'automatisation (`integration.outbound`), sinon absent. */
  @Prop({ type: String, maxlength: 150 })
  topic?: string;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  })
  organization_id!: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Property' })
  property_id?: Types.ObjectId;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'IntegrationEndpoint',
    required: true,
    index: true,
  })
  endpoint_id!: Types.ObjectId;

  @Prop({ type: Object, required: true })
  envelope!: OutboundEnvelope;

  @Prop({
    type: String,
    enum: Object.values(OutboxStatus),
    default: OutboxStatus.PENDING,
  })
  status!: OutboxStatus;

  @Prop({ type: Number, min: 0, default: 0 })
  attempts!: number;

  @Prop({ type: Number, min: 1, default: DEFAULT_MAX_ATTEMPTS })
  max_attempts!: number;

  @Prop({ type: Date, default: Date.now })
  next_attempt_at!: Date;

  /** Fin du bail de livraison (statut `delivering`). */
  @Prop({ type: Date })
  locked_until?: Date;

  /** Jeton du bail : seule l'instance qui l'a posé peut conclure la livraison. */
  @Prop({ type: String, maxlength: 64 })
  lock_token?: string;

  @Prop({ type: Date })
  last_attempt_at?: Date;

  @Prop({ type: String, maxlength: 1000 })
  last_error?: string;

  @Prop({ type: Number })
  last_status_code?: number;

  @Prop({ type: Number })
  last_latency_ms?: number;

  @Prop({ type: Date })
  delivered_at?: Date;

  created_at!: Date;
  updated_at!: Date;
}

export const OutboxMessageSchema = SchemaFactory.createForClass(OutboxMessage);

/** Mise en file idempotente : un seul message par événement et destinataire. */
OutboxMessageSchema.index({ event_id: 1, endpoint_id: 1 }, { unique: true });
/** Sélection des messages dus par le répartiteur. */
OutboxMessageSchema.index({ status: 1, next_attempt_at: 1 });
OutboxMessageSchema.index({ status: 1, locked_until: 1 });
OutboxMessageSchema.index({ organization_id: 1, status: 1, created_at: -1 });
OutboxMessageSchema.index({ last_attempt_at: -1 });
/** Purge automatique des messages livrés après 30 jours. */
OutboxMessageSchema.index(
  { delivered_at: 1 },
  {
    expireAfterSeconds: DELIVERED_TTL_SECONDS,
    partialFilterExpression: { status: OutboxStatus.DELIVERED },
  },
);
