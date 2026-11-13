import {
  AspectSentiment,
  ReviewAspect,
  SentimentLabel,
} from '../schemas/sentiment-analysis.entity';

/** Données minimales nécessaires à l'agrégation. */
export interface SentimentSample {
  score: number;
  label: SentimentLabel;
  aspects?: AspectSentiment[];
  is_alert?: boolean;
  analyzed_at?: Date;
  created_at?: Date;
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

export type TrendGranularity = 'day' | 'week' | 'month';

export interface TrendPoint {
  period: string;
  count: number;
  average_score: number;
  negative_share: number;
}

const round = (v: number, d = 3) => Math.round(v * 10 ** d) / 10 ** d;

const SUGGESTIONS: Record<ReviewAspect, string> = {
  [ReviewAspect.CLEANLINESS]:
    'Renforcer les contrôles qualité du ménage (check-list par chambre, inspection aléatoire).',
  [ReviewAspect.STAFF]:
    'Prévoir une formation accueil/relation client et revoir le staffing aux heures de pointe.',
  [ReviewAspect.LOCATION]:
    'Mieux informer sur l’accès et les transports (navettes, plan, partenariats taxis).',
  [ReviewAspect.PRICE]:
    'Revoir le positionnement tarifaire ou mieux valoriser les prestations incluses.',
  [ReviewAspect.FOOD]:
    'Analyser la carte et le petit-déjeuner (variété, qualité, température de service).',
  [ReviewAspect.NOISE]:
    'Identifier les chambres exposées au bruit (isolation, attribution prioritaire des chambres calmes).',
};

/**
 * Agrège un ensemble d'analyses : distribution, score moyen, sentiment net
 * et synthèse par aspect. Retourne des zéros pour une liste vide.
 */
export function summarizeSentiments(
  samples: SentimentSample[],
): SentimentSummary {
  const distribution: Record<SentimentLabel, number> = {
    [SentimentLabel.POSITIVE]: 0,
    [SentimentLabel.NEUTRAL]: 0,
    [SentimentLabel.NEGATIVE]: 0,
  };
  const aspectMap = new Map<
    ReviewAspect,
    { sum: number; mentions: number; positive: number; negative: number }
  >();
  let scoreSum = 0;
  let alerts = 0;

  for (const sample of samples) {
    distribution[sample.label] += 1;
    scoreSum += sample.score;
    if (sample.is_alert) alerts += 1;
    for (const aspect of sample.aspects ?? []) {
      const entry = aspectMap.get(aspect.aspect) ?? {
        sum: 0,
        mentions: 0,
        positive: 0,
        negative: 0,
      };
      entry.sum += aspect.score;
      entry.mentions += 1;
      if (aspect.label === SentimentLabel.POSITIVE) entry.positive += 1;
      if (aspect.label === SentimentLabel.NEGATIVE) entry.negative += 1;
      aspectMap.set(aspect.aspect, entry);
    }
  }

  const total = samples.length;
  const pct = (n: number) => (total === 0 ? 0 : round((n / total) * 100, 2));
  const aspects: AspectSummary[] = [...aspectMap.entries()].map(
    ([aspect, e]) => ({
      aspect,
      mentions: e.mentions,
      average_score: round(e.sum / e.mentions),
      positive: e.positive,
      negative: e.negative,
    }),
  );

  return {
    total,
    average_score: total === 0 ? 0 : round(scoreSum / total),
    distribution,
    percentages: {
      [SentimentLabel.POSITIVE]: pct(distribution.positive),
      [SentimentLabel.NEUTRAL]: pct(distribution.neutral),
      [SentimentLabel.NEGATIVE]: pct(distribution.negative),
    },
    net_sentiment: round(
      pct(distribution.positive) - pct(distribution.negative),
      2,
    ),
    alerts,
    aspects,
    top_positive_aspects: aspects
      .filter((a) => a.average_score > 0)
      .sort((a, b) => b.average_score - a.average_score)
      .slice(0, 3),
    top_negative_aspects: aspects
      .filter((a) => a.average_score < 0)
      .sort((a, b) => a.average_score - b.average_score)
      .slice(0, 3),
  };
}

/** Clé de période (UTC) d'une date selon la granularité. */
export function periodKey(date: Date, granularity: TrendGranularity): string {
  const iso = date.toISOString();
  if (granularity === 'month') return iso.slice(0, 7);
  if (granularity === 'day') return iso.slice(0, 10);
  // Semaine : lundi de la semaine ISO.
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const offset = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - offset);
  return d.toISOString().slice(0, 10);
}

/** Tendance chronologique du sentiment par période. */
export function buildSentimentTrend(
  samples: SentimentSample[],
  granularity: TrendGranularity = 'month',
): TrendPoint[] {
  const buckets = new Map<string, { sum: number; n: number; neg: number }>();
  for (const sample of samples) {
    const date = sample.analyzed_at ?? sample.created_at;
    if (!date) continue;
    const key = periodKey(new Date(date), granularity);
    const b = buckets.get(key) ?? { sum: 0, n: 0, neg: 0 };
    b.sum += sample.score;
    b.n += 1;
    if (sample.label === SentimentLabel.NEGATIVE) b.neg += 1;
    buckets.set(key, b);
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, b]) => ({
      period,
      count: b.n,
      average_score: round(b.sum / b.n),
      negative_share: round((b.neg / b.n) * 100, 2),
    }));
}

/** Suggestions d'amélioration pour les aspects jugés négativement. */
export function improvementSuggestions(
  summary: SentimentSummary,
): { aspect: ReviewAspect; average_score: number; suggestion: string }[] {
  return summary.aspects
    .filter((a) => a.average_score < 0 || a.negative > a.positive)
    .sort((a, b) => a.average_score - b.average_score)
    .map((a) => ({
      aspect: a.aspect,
      average_score: a.average_score,
      suggestion: SUGGESTIONS[a.aspect],
    }));
}
