import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { AuditableEntity } from '../../base-entities/embeddables/auditable.entity';
import {
  DEFAULT_MAX_ATTEMPTS,
  DEFAULT_TIMEOUT_MS,
  MAX_TIMEOUT_MS,
  MIN_TIMEOUT_MS,
} from '../integration-bus.constants';

export type IntegrationEndpointDocument = HydratedDocument<IntegrationEndpoint>;

/** Mode de livraison d'un point de terminaison. */
export enum IntegrationEndpointKind {
  /** POST HTTP signé vers une URL. */
  WEBHOOK = 'webhook',
  /** Publication via l'adaptateur de courtier (RabbitMQ, Kafka…). */
  BROKER = 'broker',
}

/**
 * Point de terminaison sortant de l'ESB : système externe abonné à des
 * événements métier (gestionnaire de canaux, logiciel comptable, BI…).
 *
 * Le secret de signature est chiffré au repos (AES-256-GCM) et n'est
 * jamais renvoyé par l'API (seulement `secret_hint`).
 * Désactivé automatiquement après `INTEGRATION_AUTO_DISABLE_AFTER` (50 par
 * défaut) échecs consécutifs ou sur réponse HTTP 410.
 */
@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'integration_endpoints',
})
export class IntegrationEndpoint extends AuditableEntity {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  })
  organization_id!: Types.ObjectId;

  /** Restreint l'abonnement aux événements d'un établissement. */
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Property', index: true })
  property_id?: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true, maxlength: 120 })
  name!: string;

  @Prop({ type: String, trim: true, maxlength: 500 })
  description?: string;

  @Prop({
    type: String,
    enum: Object.values(IntegrationEndpointKind),
    default: IntegrationEndpointKind.WEBHOOK,
  })
  kind!: IntegrationEndpointKind;

  /** URL de livraison (webhook). */
  @Prop({ type: String, trim: true, maxlength: 2048 })
  url?: string;

  /** Destination côté courtier (échange/sujet) pour le type `broker`. */
  @Prop({ type: String, trim: true, maxlength: 255 })
  broker_destination?: string;

  /** Noms exacts, préfixes (`billing.*`) ou `*`. */
  @Prop({ type: [String], default: [] })
  event_patterns!: string[];

  /** Secret HMAC chiffré (`v1:iv:tag:chiffré`) — jamais sérialisé. */
  @Prop({ type: String, select: false })
  secret_encrypted?: string;

  @Prop({ type: String, maxlength: 20 })
  secret_hint?: string;

  /** En-têtes personnalisés (hors en-têtes réservés et Authorization). */
  @Prop({ type: Object, default: () => ({}) })
  headers!: Record<string, string>;

  @Prop({
    type: Number,
    min: MIN_TIMEOUT_MS,
    max: MAX_TIMEOUT_MS,
    default: DEFAULT_TIMEOUT_MS,
  })
  timeout_ms!: number;

  @Prop({ type: Number, min: 1, max: 20, default: DEFAULT_MAX_ATTEMPTS })
  max_attempts!: number;

  @Prop({ type: Boolean, default: true, index: true })
  is_active!: boolean;

  @Prop({ type: Date })
  last_success_at?: Date;

  @Prop({ type: Date })
  last_failure_at?: Date;

  @Prop({ type: String, maxlength: 1000 })
  last_error?: string;

  @Prop({ type: Number, min: 0, default: 0 })
  consecutive_failures!: number;

  @Prop({ type: Date })
  disabled_at?: Date;

  @Prop({ type: String, maxlength: 500 })
  disabled_reason?: string;

  @Prop({ type: SchemaTypes.ObjectId })
  created_by?: Types.ObjectId;
}

export const IntegrationEndpointSchema =
  SchemaFactory.createForClass(IntegrationEndpoint);

IntegrationEndpointSchema.index({
  organization_id: 1,
  is_active: 1,
  is_deleted: 1,
});

/** Ne jamais sérialiser le secret chiffré, même chargé explicitement. */
IntegrationEndpointSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    delete (ret as unknown as Record<string, unknown>).secret_encrypted;
    return ret;
  },
});
