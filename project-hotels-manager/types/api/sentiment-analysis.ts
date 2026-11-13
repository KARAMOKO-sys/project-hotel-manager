// =============================================================================
// FICHIER GÉNÉRÉ par scripts/generate-api.mjs — ne pas modifier à la main.
// Source : project-hotels-manager-backend/src/sentiment-analysis/
// =============================================================================

import type { AuditableEntity } from "./base-entities";
import type { PaginationQueryDto } from "./common";

/** Avis à analyser puis enregistrer. Le score, le libellé, les aspects et les émotions sont calculés par le service, jamais fournis par le client. */
export interface CreateSentimentAnalysisDto {
  property_id: string;
  text: string;
  source?: ReviewSource;
  source_ref?: string;
  guest_id?: string;
  reservation_id?: string;
  rating?: number;
  language?: SentimentLanguage;
  metadata?: Record<string, unknown>;
}

/** Texte à analyser sans persistance. */
export interface AnalyzeTextDto {
  text: string;
}

export interface SentimentFilterQueryDto extends PaginationQueryDto {
  label?: SentimentLabel;
}

/** Période d'agrégation (bornes incluses, dates ISO). */
export interface SentimentPeriodQueryDto {
  from?: string;
  to?: string;
}

export interface SentimentTrendQueryDto extends SentimentPeriodQueryDto {
  granularity?: "day" | "week" | "month";
}

export interface SentimentAlertQueryDto {
  /** Score en dessous duquel un avis est remonté (défaut -0,4). */
  threshold?: number;
}

export interface AcknowledgeAlertDto {
  user_id?: string;
}

/** Mise à jour : si `text` change, l'analyse est recalculée. */
export type UpdateSentimentAnalysisDto = Partial<CreateSentimentAnalysisDto>;

export interface AspectScore {
  aspect: ReviewAspect;
  score: number;
  label: SentimentLabel;
  mentions: number;
}

export interface SentimentScore {
  score: number;
  label: SentimentLabel;
  confidence: number;
  language: SentimentLanguage | null;
  aspects: AspectScore[];
  emotions: ReviewEmotion[];
  /** Mots du lexique trouvés, avec leur contribution (explicabilité). */
  contributions: Array<{ word: string; value: number }>;
  model_version: string;
}

export interface AspectSummary {
  aspect: ReviewAspect;
  mentions: number;
  average_score: number;
  positive: number;
  negative: number;
}

export interface SentimentSummary {
  total: number;
  average_score: number;
  distribution: Record<SentimentLabel, number>;
  /** Pourcentages (0-100) par libellé. */
  percentages: Record<SentimentLabel, number>;
  /** Indice net : % positifs - % négatifs (-100 à 100). */
  net_sentiment: number;
  alerts: number;
  aspects: AspectSummary[];
  top_positive_aspects: AspectSummary[];
  top_negative_aspects: AspectSummary[];
}

export interface TrendPoint {
  period: string;
  count: number;
  average_score: number;
  negative_share: number;
}

/** Polarité globale d'un avis. */
export enum SentimentLabel {
  POSITIVE = "positive",
  NEUTRAL = "neutral",
  NEGATIVE = "negative",
}

/** Langues supportées par le scoreur lexical. */
export enum SentimentLanguage {
  FR = "fr",
  EN = "en",
}

/** Provenance de l'avis analysé. */
export enum ReviewSource {
  INTERNAL = "internal",
  SURVEY = "survey",
  CHATBOT = "chatbot",
  GOOGLE = "google",
  BOOKING = "booking",
  EXPEDIA = "expedia",
  TRIPADVISOR = "tripadvisor",
  AIRBNB = "airbnb",
  OTHER = "other",
}

/** Aspects de l'expérience client détectés dans les avis. */
export enum ReviewAspect {
  CLEANLINESS = "cleanliness",
  STAFF = "staff",
  LOCATION = "location",
  PRICE = "price",
  FOOD = "food",
  NOISE = "noise",
}

/** Émotions détectées par mots-clés. */
export enum ReviewEmotion {
  JOY = "joy",
  SATISFACTION = "satisfaction",
  ANGER = "anger",
  FRUSTRATION = "frustration",
  DISAPPOINTMENT = "disappointment",
}

/** Sentiment associé à un aspect précis d'un avis. */
export interface AspectSentiment {
  aspect: ReviewAspect;
  score: number;
  label: SentimentLabel;
  mentions: number;
}

/** Résultat d'analyse de sentiment d'un avis client. */
export interface SentimentAnalysis extends AuditableEntity {
  property_id: string;
  guest_id?: string;
  reservation_id?: string;
  source: ReviewSource;
  /** Identifiant de l'avis chez la source externe (dédoublonnage). */
  source_ref?: string;
  text: string;
  /** Note attribuée par le client sur la plateforme source (1 à 5). */
  rating?: number;
  language?: SentimentLanguage;
  /** Score global entre -1 (très négatif) et 1 (très positif). */
  score: number;
  label: SentimentLabel;
  /** Couverture lexicale de l'analyse (0 = aucun mot connu, 1 = forte). */
  confidence: number;
  aspects: AspectSentiment[];
  emotions: ReviewEmotion[];
  /** Avis négatif nécessitant l'attention de l'équipe. */
  is_alert: boolean;
  alert_acknowledged: boolean;
  acknowledged_at?: string;
  acknowledged_by?: string;
  /** Version du scoreur ayant produit le résultat. */
  model_version: string;
  analyzed_at: string;
  metadata: Record<string, unknown>;
}
