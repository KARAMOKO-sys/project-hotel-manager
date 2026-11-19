import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { AuditableEntity } from '../../base-entities/embeddables/auditable.entity';
import { WebhookProvider } from '../../webhook-log/schemas/webhook-log.entity';
import { DEFAULT_SIGNATURE_TOLERANCE_SECONDS } from '../integration-bus.constants';

export type IntegrationInboundSourceDocument =
  HydratedDocument<IntegrationInboundSource>;

/** Schéma de signature attendu sur les webhooks entrants. */
export enum InboundSignatureScheme {
  /**
   * Même format que nos envois : `X-PleasantStay-Timestamp` +
   * `X-PleasantStay-Signature: v1=<hex HMAC(secret, "ts.corps")>`.
   */
  PLEASANTSTAY_V1 = 'pleasantstay_v1',
  /** HMAC-SHA256 hexadécimal du corps brut dans un en-tête configurable. */
  HMAC_SHA256_HEX_HEADER = 'hmac_sha256_hex_header',
}

/**
 * Source de webhooks entrants (CinetPay, Orange Money, Wave, OTA…).
 * L'URL publique `POST /api/integration/inbound/:key` contient une clé
 * aléatoire non devinable ; chaque requête doit être signée.
 */
@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'integration_inbound_sources',
})
export class IntegrationInboundSource extends AuditableEntity {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  })
  organization_id!: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Property', index: true })
  property_id?: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true, maxlength: 120 })
  name!: string;

  /** Clé publique non devinable de l'URL de réception. */
  @Prop({ type: String, required: true, unique: true, maxlength: 64 })
  key!: string;

  @Prop({
    type: String,
    enum: Object.values(WebhookProvider),
    default: WebhookProvider.OTHER,
  })
  provider!: WebhookProvider;

  @Prop({ type: String, select: false })
  secret_encrypted?: string;

  @Prop({ type: String, maxlength: 20 })
  secret_hint?: string;

  @Prop({
    type: String,
    enum: Object.values(InboundSignatureScheme),
    default: InboundSignatureScheme.PLEASANTSTAY_V1,
  })
  signature_scheme!: InboundSignatureScheme;

  /** En-tête portant la signature (schéma `hmac_sha256_hex_header`). */
  @Prop({ type: String, trim: true, lowercase: true, maxlength: 100 })
  signature_header?: string;

  /** Préfixe éventuel de la signature (ex. `sha256=`). */
  @Prop({ type: String, maxlength: 30 })
  signature_prefix?: string;

  /** Tolérance d'horodatage (anti-rejeu), en secondes. */
  @Prop({
    type: Number,
    min: 30,
    max: 3600,
    default: DEFAULT_SIGNATURE_TOLERANCE_SECONDS,
  })
  tolerance_seconds!: number;

  /** Chemin (notation pointée) de l'identifiant d'événement du fournisseur. */
  @Prop({ type: String, trim: true, maxlength: 100 })
  event_id_path?: string;

  /** Chemin (notation pointée) du type d'événement. */
  @Prop({ type: String, trim: true, maxlength: 100 })
  event_type_path?: string;

  @Prop({ type: Boolean, default: true, index: true })
  is_active!: boolean;

  @Prop({ type: Date })
  last_received_at?: Date;

  @Prop({ type: Number, min: 0, default: 0 })
  received_count!: number;

  @Prop({ type: Number, min: 0, default: 0 })
  rejected_count!: number;

  @Prop({ type: SchemaTypes.ObjectId })
  created_by?: Types.ObjectId;
}

export const IntegrationInboundSourceSchema = SchemaFactory.createForClass(
  IntegrationInboundSource,
);

IntegrationInboundSourceSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    delete (ret as unknown as Record<string, unknown>).secret_encrypted;
    return ret;
  },
});
