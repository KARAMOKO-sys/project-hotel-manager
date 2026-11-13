import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types, SchemaTypes } from 'mongoose';
import { AuditableEntity } from '../../base-entities/embeddables/auditable.entity';
import {
  MoneyEmbeddable,
  MoneySchema,
} from '../../base-entities/embeddables/money.embeddable';

export type RecommendationDocument = HydratedDocument<Recommendation>;

/** Nature de la recommandation. */
export enum RecommendationType {
  /** Montée en gamme (chambre supérieure, formule premium). */
  UPSELL = 'upsell',
  /** Produit complémentaire (spa, transfert, excursion). */
  CROSS_SELL = 'cross_sell',
  /** Service de l'établissement (restaurant, blanchisserie…). */
  SERVICE = 'service',
  /** Type de chambre recommandé pour un prochain séjour. */
  ROOM = 'room',
  /** Forfait séjour + activités. */
  PACKAGE = 'package',
}

/** Cycle de vie d'une recommandation. */
export enum RecommendationStatus {
  /** Générée, pas encore présentée. */
  PENDING = 'pending',
  SHOWN = 'shown',
  ACCEPTED = 'accepted',
  DISMISSED = 'dismissed',
  EXPIRED = 'expired',
}

/** Recommandation personnalisée proposée à un client. */
@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'recommendations',
})
export class Recommendation extends AuditableEntity {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Guest', required: true, index: true })
  guest_id!: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Property', required: true, index: true })
  property_id!: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Reservation', index: true })
  reservation_id?: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(RecommendationType),
    required: true,
    index: true,
  })
  type!: RecommendationType;

  /** Élément recommandé (type de chambre, article POS, offre…). */
  @Prop({ type: SchemaTypes.ObjectId })
  item_id?: Types.ObjectId;

  /** Collection de l'élément recommandé (`RoomType`, `PosItem`…). */
  @Prop({ type: String, trim: true, maxlength: 50 })
  item_type?: string;

  @Prop({ type: String, required: true, trim: true, maxlength: 200 })
  title!: string;

  @Prop({ type: String, maxlength: 1000 })
  description?: string;

  /** Catégorie métier (spa, restaurant, room_upgrade…). */
  @Prop({ type: String, trim: true, lowercase: true, maxlength: 50 })
  category?: string;

  @Prop({ type: [String], default: [] })
  tags!: string[];

  @Prop({ type: MoneySchema })
  price?: MoneyEmbeddable;

  /** Pertinence estimée entre 0 et 1. */
  @Prop({ type: Number, min: 0, max: 1, required: true })
  score!: number;

  /** Raisons lisibles ayant conduit à la recommandation. */
  @Prop({ type: [String], default: [] })
  reasons!: string[];

  @Prop({
    type: String,
    enum: Object.values(RecommendationStatus),
    default: RecommendationStatus.PENDING,
    index: true,
  })
  status!: RecommendationStatus;

  @Prop({ type: Date })
  shown_at?: Date;

  @Prop({ type: Date })
  responded_at?: Date;

  @Prop({ type: Date })
  expires_at?: Date;

  @Prop({ type: String, maxlength: 500 })
  dismiss_reason?: string;

  /** Chiffre d'affaires réalisé si la recommandation est acceptée. */
  @Prop({ type: Number, min: 0, default: 0 })
  revenue_generated!: number;

  @Prop({ type: String, default: 'content-based-v1' })
  model_version!: string;

  @Prop({ type: Object, default: () => ({}) })
  metadata!: Record<string, any>;
}

export const RecommendationSchema =
  SchemaFactory.createForClass(Recommendation);

RecommendationSchema.index({ guest_id: 1, status: 1, created_at: -1 });
RecommendationSchema.index({ property_id: 1, type: 1, status: 1 });
