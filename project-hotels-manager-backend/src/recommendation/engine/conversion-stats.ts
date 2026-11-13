import {
  RecommendationStatus,
  RecommendationType,
} from '../schemas/recommendation.entity';

export interface ConversionSample {
  type: RecommendationType;
  status: RecommendationStatus;
  revenue_generated?: number;
}

export interface TypeConversion {
  exposed: number;
  accepted: number;
  conversion_rate: number;
}

export interface ConversionStats {
  total: number;
  by_status: Record<RecommendationStatus, number>;
  /** Recommandations effectivement vues (affichées, acceptées ou refusées). */
  exposed: number;
  /** % acceptées / exposées. */
  conversion_rate: number;
  /** % acceptées / (acceptées + refusées) : taux de réponse positive. */
  acceptance_rate: number;
  revenue_generated: number;
  by_type: Partial<Record<RecommendationType, TypeConversion>>;
}

const pct = (num: number, den: number) =>
  den === 0 ? 0 : Math.round((num / den) * 10000) / 100;

const EXPOSED = new Set<RecommendationStatus>([
  RecommendationStatus.SHOWN,
  RecommendationStatus.ACCEPTED,
  RecommendationStatus.DISMISSED,
]);

/** Calcule les indicateurs de conversion (divisions par zéro → 0). */
export function computeConversionStats(
  samples: ConversionSample[],
): ConversionStats {
  const by_status = Object.fromEntries(
    Object.values(RecommendationStatus).map((s) => [s, 0]),
  ) as Record<RecommendationStatus, number>;
  const byType: Partial<
    Record<RecommendationType, { exposed: number; accepted: number }>
  > = {};
  let revenue = 0;

  for (const s of samples) {
    by_status[s.status] += 1;
    if (s.status === RecommendationStatus.ACCEPTED) {
      revenue += s.revenue_generated ?? 0;
    }
    if (EXPOSED.has(s.status)) {
      const t = (byType[s.type] ??= { exposed: 0, accepted: 0 });
      t.exposed += 1;
      if (s.status === RecommendationStatus.ACCEPTED) t.accepted += 1;
    }
  }

  const accepted = by_status[RecommendationStatus.ACCEPTED];
  const dismissed = by_status[RecommendationStatus.DISMISSED];
  const exposed = accepted + dismissed + by_status[RecommendationStatus.SHOWN];

  const by_type: Partial<Record<RecommendationType, TypeConversion>> = {};
  for (const [type, t] of Object.entries(byType) as [
    RecommendationType,
    { exposed: number; accepted: number },
  ][]) {
    by_type[type] = { ...t, conversion_rate: pct(t.accepted, t.exposed) };
  }

  return {
    total: samples.length,
    by_status,
    exposed,
    conversion_rate: pct(accepted, exposed),
    acceptance_rate: pct(accepted, accepted + dismissed),
    revenue_generated: Math.round(revenue * 100) / 100,
    by_type,
  };
}
