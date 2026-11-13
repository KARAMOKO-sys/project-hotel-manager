import { KpiMetric } from '../schemas/kpi.entity';

/**
 * Fonctions pures de calcul des indicateurs hôteliers.
 *
 * Toutes les divisions sont protégées : un dénominateur nul (ou invalide)
 * donne 0, jamais `NaN` ni `Infinity`.
 */

export interface KpiInput {
  rooms_available: number;
  rooms_sold: number;
  room_revenue: number;
  total_revenue?: number;
  gross_operating_profit?: number;
  reservations_count?: number;
  cancellations_count?: number;
  stays_count?: number;
}

export interface KpiMetrics {
  occupancy_rate: number;
  adr: number;
  revpar: number;
  trevpar: number;
  goppar: number | null;
  cancellation_rate: number;
  average_length_of_stay: number;
}

export interface MetricVariation {
  current: number | null;
  previous: number | null;
  absolute: number | null;
  /** Variation relative en % (null si la valeur précédente est 0 ou absente). */
  percent: number | null;
  trend: 'up' | 'down' | 'stable' | null;
}

const round2 = (v: number) => Math.round(v * 100) / 100;

/** Division protégée : 0 si le dénominateur est nul, négatif ou non fini. */
export function safeDivide(numerator: number, denominator: number): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) return 0;
  if (denominator <= 0) return 0;
  return numerator / denominator;
}

/** Taux d'occupation (%) = chambres vendues / chambres disponibles × 100. */
export function occupancyRate(roomsSold: number, roomsAvailable: number) {
  return round2(safeDivide(roomsSold, roomsAvailable) * 100);
}

/** ADR = CA hébergement / chambres vendues. */
export function averageDailyRate(roomRevenue: number, roomsSold: number) {
  return round2(safeDivide(roomRevenue, roomsSold));
}

/** RevPAR = CA hébergement / chambres disponibles (= ADR × occupation). */
export function revPar(roomRevenue: number, roomsAvailable: number) {
  return round2(safeDivide(roomRevenue, roomsAvailable));
}

/** TRevPAR = CA total / chambres disponibles. */
export function trevPar(totalRevenue: number, roomsAvailable: number) {
  return round2(safeDivide(totalRevenue, roomsAvailable));
}

/** GOPPAR = résultat brut d'exploitation / chambres disponibles. */
export function gopPar(gop: number, roomsAvailable: number) {
  return round2(safeDivide(gop, roomsAvailable));
}

/** Taux d'annulation (%) = annulations / réservations × 100. */
export function cancellationRate(cancellations: number, reservations: number) {
  return round2(safeDivide(cancellations, reservations) * 100);
}

/** Durée moyenne de séjour = nuitées vendues / nombre de séjours. */
export function averageLengthOfStay(roomNights: number, stays: number) {
  return round2(safeDivide(roomNights, stays));
}

/** Valide la cohérence des données brutes ; retourne la liste des erreurs. */
export function validateKpiInput(input: KpiInput): string[] {
  const errors: string[] = [];
  const nonNegative: (keyof KpiInput)[] = [
    'rooms_available',
    'rooms_sold',
    'room_revenue',
    'total_revenue',
    'reservations_count',
    'cancellations_count',
    'stays_count',
  ];
  for (const key of nonNegative) {
    const value = input[key];
    if (value !== undefined && (!Number.isFinite(value) || value < 0)) {
      errors.push(`${key} doit être un nombre positif`);
    }
  }
  if (input.rooms_sold > input.rooms_available) {
    errors.push(
      'rooms_sold ne peut pas dépasser rooms_available (occupation > 100 %)',
    );
  }
  if (
    input.total_revenue !== undefined &&
    input.total_revenue > 0 &&
    input.total_revenue < input.room_revenue
  ) {
    errors.push('total_revenue ne peut pas être inférieur à room_revenue');
  }
  if ((input.cancellations_count ?? 0) > (input.reservations_count ?? 0)) {
    errors.push('cancellations_count ne peut pas dépasser reservations_count');
  }
  return errors;
}

/** Calcule l'ensemble des indicateurs à partir des données brutes. */
export function computeKpis(input: KpiInput): KpiMetrics {
  const totalRevenue = input.total_revenue || input.room_revenue;
  return {
    occupancy_rate: occupancyRate(input.rooms_sold, input.rooms_available),
    adr: averageDailyRate(input.room_revenue, input.rooms_sold),
    revpar: revPar(input.room_revenue, input.rooms_available),
    trevpar: trevPar(totalRevenue, input.rooms_available),
    goppar:
      input.gross_operating_profit === undefined
        ? null
        : gopPar(input.gross_operating_profit, input.rooms_available),
    cancellation_rate: cancellationRate(
      input.cancellations_count ?? 0,
      input.reservations_count ?? 0,
    ),
    average_length_of_stay: averageLengthOfStay(
      input.rooms_sold,
      input.stays_count ?? 0,
    ),
  };
}

/** Variation d'un indicateur entre deux périodes. */
export function variation(
  current: number | null | undefined,
  previous: number | null | undefined,
): MetricVariation {
  const c = current ?? null;
  const p = previous ?? null;
  if (c === null || p === null) {
    return {
      current: c,
      previous: p,
      absolute: null,
      percent: null,
      trend: null,
    };
  }
  const absolute = round2(c - p);
  return {
    current: c,
    previous: p,
    absolute,
    percent: p === 0 ? null : round2(((c - p) / Math.abs(p)) * 100),
    trend: absolute > 0 ? 'up' : absolute < 0 ? 'down' : 'stable',
  };
}

/** Compare deux jeux d'indicateurs, métrique par métrique. */
export function compareMetrics(
  current: Partial<Record<KpiMetric, number | null>>,
  previous: Partial<Record<KpiMetric, number | null>> | null,
  metrics: KpiMetric[] = Object.values(KpiMetric),
): Partial<Record<KpiMetric, MetricVariation>> {
  const result: Partial<Record<KpiMetric, MetricVariation>> = {};
  for (const metric of metrics) {
    result[metric] = variation(current[metric], previous?.[metric]);
  }
  return result;
}
