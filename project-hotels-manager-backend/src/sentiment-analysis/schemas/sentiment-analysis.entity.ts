import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types, SchemaTypes } from 'mongoose';
import { AuditableEntity } from '../../base-entities/embeddables/auditable.entity';

export type SentimentAnalysisDocument = HydratedDocument<SentimentAnalysis>;

/** Polarité globale d'un avis. */
export enum SentimentLabel {
  POSITIVE = 'positive',
  NEUTRAL = 'neutral',
  NEGATIVE = 'negative',
}

/** Langues supportées par le scoreur lexical. */
export enum SentimentLanguage {
  FR = 'fr',
  EN = 'en',
}

/** Provenance de l'avis analysé. */
export enum ReviewSource {
  INTERNAL = 'internal',
  SURVEY = 'survey',
  CHATBOT = 'chatbot',
  GOOGLE = 'google',
  BOOKING = 'booking',
  EXPEDIA = 'expedia',
  TRIPADVISOR = 'tripadvisor',
  AIRBNB = 'airbnb',
  OTHER = 'other',
}

/** Aspects de l'expérience client détectés dans les avis. */
export enum ReviewAspect {
  CLEANLINESS = 'cleanliness',
  STAFF = 'staff',
  LOCATION = 'location',
  PRICE = 'price',
  FOOD = 'food',
  NOISE = 'noise',
}

/** Émotions détectées par mots-clés. */
export enum ReviewEmotion {
  JOY = 'joy',
  SATISFACTION = 'satisfaction',
  ANGER = 'anger',
  FRUSTRATION = 'frustration',
  DISAPPOINTMENT = 'disappointment',
}

/** Sentiment associé à un aspect précis d'un avis. */
@Schema({ _id: false })
export class AspectSentiment {
  @Prop({ type: String, enum: Object.values(ReviewAspect), required: true })
  aspect!: ReviewAspect;

  @Prop({ type: Number, min: -1, max: 1, required: true })
  score!: number;

  @Prop({ type: String, enum: Object.values(SentimentLabel), required: true })
  label!: SentimentLabel;

  @Prop({ type: Number, min: 1, default: 1 })
  mentions!: number;
}

export const AspectSentimentSchema =
  SchemaFactory.createForClass(AspectSentiment);

/** Résultat d'analyse de sentiment d'un avis client. */
@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'sentiment_analyses',
})
export class SentimentAnalysis extends AuditableEntity {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Property', required: true, index: true })
  property_id!: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Guest', index: true })
  guest_id?: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Reservation' })
  reservation_id?: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(ReviewSource),
    default: ReviewSource.INTERNAL,
  })
  source!: ReviewSource;

  /** Identifiant de l'avis chez la source externe (dédoublonnage). */
  @Prop({ type: String, trim: true, maxlength: 200 })
  source_ref?: string;

  @Prop({ type: String, required: true, trim: true, maxlength: 5000 })
  text!: string;

  /** Note attribuée par le client sur la plateforme source (1 à 5). */
  @Prop({ type: Number, min: 1, max: 5 })
  rating?: number;

  @Prop({ type: String, enum: Object.values(SentimentLanguage) })
  language?: SentimentLanguage;

  /** Score global entre -1 (très négatif) et 1 (très positif). */
  @Prop({ type: Number, min: -1, max: 1, required: true })
  score!: number;

  @Prop({
    type: String,
    enum: Object.values(SentimentLabel),
    required: true,
    index: true,
  })
  label!: SentimentLabel;

  /** Couverture lexicale de l'analyse (0 = aucun mot connu, 1 = forte). */
  @Prop({ type: Number, min: 0, max: 1, default: 0 })
  confidence!: number;

  @Prop({ type: [AspectSentimentSchema], default: [] })
  aspects!: AspectSentiment[];

  @Prop({ type: [String], enum: Object.values(ReviewEmotion), default: [] })
  emotions!: ReviewEmotion[];

  /** Avis négatif nécessitant l'attention de l'équipe. */
  @Prop({ type: Boolean, default: false, index: true })
  is_alert!: boolean;

  @Prop({ type: Boolean, default: false })
  alert_acknowledged!: boolean;

  @Prop({ type: Date })
  acknowledged_at?: Date;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' })
  acknowledged_by?: Types.ObjectId;

  /** Version du scoreur ayant produit le résultat. */
  @Prop({ type: String, default: 'lexicon-v1' })
  model_version!: string;

  @Prop({ type: Date, default: Date.now })
  analyzed_at!: Date;

  @Prop({ type: Object, default: () => ({}) })
  metadata!: Record<string, any>;
}

export const SentimentAnalysisSchema =
  SchemaFactory.createForClass(SentimentAnalysis);

SentimentAnalysisSchema.index({ property_id: 1, analyzed_at: -1 });
SentimentAnalysisSchema.index({ property_id: 1, label: 1 });
SentimentAnalysisSchema.index({
  property_id: 1,
  is_alert: 1,
  alert_acknowledged: 1,
});
SentimentAnalysisSchema.index(
  { source: 1, source_ref: 1 },
  {
    unique: true,
    partialFilterExpression: { source_ref: { $type: 'string' } },
  },
);
