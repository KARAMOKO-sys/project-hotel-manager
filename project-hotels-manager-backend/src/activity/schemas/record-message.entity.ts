import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { AuditableEntity } from '../../base-entities/embeddables/auditable.entity';

export type RecordMessageDocument = HydratedDocument<RecordMessage>;

/** Nature d'un message du fil de discussion. */
export enum RecordMessageType {
  /** Note interne. */
  NOTE = 'note',
  /** Commentaire (visible des abonnés). */
  COMMENT = 'comment',
  /** Suivi automatique d'un événement métier. */
  TRACKING = 'tracking',
  /** Message système (activité terminée, automatisation…). */
  SYSTEM = 'system',
}

/** Valeur suivie (ancienne → nouvelle). */
export interface TrackingValue {
  field: string;
  old?: unknown;
  new?: unknown;
}

/**
 * Message du fil de discussion d'une fiche (« chatter »).
 * Le corps est du texte brut : il n'est jamais interprété comme du HTML.
 */
@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'record_messages',
})
export class RecordMessage extends AuditableEntity {
  /** Établissement de la fiche (absent pour les fiches sans établissement). */
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Property', index: true })
  property_id?: Types.ObjectId;

  @Prop({ type: String, required: true, maxlength: 100 })
  res_model!: string;

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  res_id!: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(RecordMessageType),
    required: true,
    default: RecordMessageType.NOTE,
  })
  message_type!: RecordMessageType;

  @Prop({ type: String, required: true, maxlength: 10000 })
  body!: string;

  @Prop({ type: SchemaTypes.ObjectId, index: true })
  author_id?: Types.ObjectId;

  /** Type d'auteur : type d'utilisateur, `system` ou `automation`. */
  @Prop({ type: String, maxlength: 50 })
  author_type?: string;

  @Prop({ type: [SchemaTypes.Mixed], default: undefined })
  tracking_values?: TrackingValue[];

  /** Nom de l'événement métier à l'origine d'un message de suivi. */
  @Prop({ type: String, maxlength: 100 })
  event_name?: string;

  /** Identifiant de l'événement (idempotence du suivi automatique). */
  @Prop({ type: String, maxlength: 100 })
  event_id?: string;
}

export const RecordMessageSchema = SchemaFactory.createForClass(RecordMessage);
RecordMessageSchema.index({ res_model: 1, res_id: 1, created_at: -1 });
RecordMessageSchema.index({ event_id: 1 }, { unique: true, sparse: true });
