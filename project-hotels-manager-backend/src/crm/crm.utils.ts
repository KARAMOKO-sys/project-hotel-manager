import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';

/** Fonctions pures du CRM (nuitées, pipeline, prévisions). */

export function toObjectId(value: unknown, field: string): Types.ObjectId {
  if (value instanceof Types.ObjectId) return value;
  const text = typeof value === 'string' ? value : '';
  if (!Types.ObjectId.isValid(text)) {
    throw new BadRequestException(`Identifiant invalide pour « ${field} »`);
  }
  return new Types.ObjectId(text);
}

export function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: number }).code === 11000
  );
}

const DAY_MS = 86_400_000;

/** Identifiant (ObjectId ou chaîne) sous forme de texte. */
function idText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value instanceof Types.ObjectId) return value.toHexString();
  return JSON.stringify(value);
}

/** Nuits entre arrivée et départ (dates UTC). */
export function nightsBetween(
  arrival?: Date | string | null,
  departure?: Date | string | null,
): number {
  if (!arrival || !departure) return 0;
  const a = new Date(arrival);
  const d = new Date(departure);
  if (Number.isNaN(a.getTime()) || Number.isNaN(d.getTime())) return 0;
  const start = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
  const end = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return Math.max(0, Math.round((end - start) / DAY_MS));
}

/** Nuitées = chambres × nuits. */
export function computeRoomNights(
  rooms: number | undefined,
  arrival?: Date | string | null,
  departure?: Date | string | null,
): number {
  return Math.max(0, rooms ?? 0) * nightsBetween(arrival, departure);
}

/** Valide arrivée < départ. */
export function assertStayDates(
  arrival?: Date | string | null,
  departure?: Date | string | null,
) {
  if (
    arrival &&
    departure &&
    new Date(departure).getTime() <= new Date(arrival).getTime()
  ) {
    throw new BadRequestException(
      "La date de départ doit être postérieure à la date d'arrivée",
    );
  }
}

export interface PipelineStageInput {
  _id: unknown;
  name: string;
  sequence: number;
  probability: number;
  is_won: boolean;
  is_lost: boolean;
}

export interface PipelineLeadInput {
  stage_id?: unknown;
  /** `open`, `won` ou `lost`. */
  state: string;
  expected_revenue?: number;
  probability?: number;
  arrival_date?: Date | string | null;
}

export interface PipelineStageRow {
  stage_id: string;
  name: string;
  sequence: number;
  is_won: boolean;
  is_lost: boolean;
  count: number;
  expected_revenue: number;
  weighted_revenue: number;
}

export interface PipelineReport {
  stages: PipelineStageRow[];
  totals: {
    count: number;
    open_count: number;
    won_count: number;
    lost_count: number;
    /** Ouvertes uniquement. */
    expected_revenue: number;
    weighted_revenue: number;
    won_revenue: number;
  };
  /** gagnées / (gagnées + perdues), en %. */
  win_rate: number;
  /** Prévision par mois d'arrivée (`YYYY-MM`, `unscheduled` si sans date). */
  forecast: {
    month: string;
    count: number;
    expected_revenue: number;
    weighted_revenue: number;
    won_revenue: number;
  }[];
}

/** Revenu pondéré d'une piste : attendu × probabilité. */
export function weightedRevenue(
  lead: Pick<PipelineLeadInput, 'expected_revenue' | 'probability'>,
): number {
  const p = Math.min(100, Math.max(0, lead.probability ?? 0));
  return round2(((lead.expected_revenue ?? 0) * p) / 100);
}

/**
 * Rapport de pipeline : par étape (nombre, revenu attendu, pondéré),
 * taux de transformation et prévision par mois d'arrivée (pistes ouvertes
 * pondérées + pistes gagnées à 100 %).
 */
export function computePipeline(
  stages: PipelineStageInput[],
  leads: PipelineLeadInput[],
): PipelineReport {
  const rows = new Map<string, PipelineStageRow>();
  for (const s of [...stages].sort((a, b) => a.sequence - b.sequence)) {
    rows.set(idText(s._id), {
      stage_id: idText(s._id),
      name: s.name,
      sequence: s.sequence,
      is_won: s.is_won,
      is_lost: s.is_lost,
      count: 0,
      expected_revenue: 0,
      weighted_revenue: 0,
    });
  }
  const totals = {
    count: 0,
    open_count: 0,
    won_count: 0,
    lost_count: 0,
    expected_revenue: 0,
    weighted_revenue: 0,
    won_revenue: 0,
  };
  const forecast = new Map<string, PipelineReport['forecast'][number]>();

  for (const lead of leads) {
    totals.count += 1;
    const expected = lead.expected_revenue ?? 0;
    const weighted =
      lead.state === 'won'
        ? round2(expected)
        : lead.state === 'lost'
          ? 0
          : weightedRevenue(lead);
    const row = lead.stage_id ? rows.get(idText(lead.stage_id)) : undefined;
    if (row) {
      row.count += 1;
      row.expected_revenue = round2(row.expected_revenue + expected);
      row.weighted_revenue = round2(row.weighted_revenue + weighted);
    }
    if (lead.state === 'won') {
      totals.won_count += 1;
      totals.won_revenue = round2(totals.won_revenue + expected);
    } else if (lead.state === 'lost') {
      totals.lost_count += 1;
      continue;
    } else {
      totals.open_count += 1;
      totals.expected_revenue = round2(totals.expected_revenue + expected);
      totals.weighted_revenue = round2(totals.weighted_revenue + weighted);
    }
    const arrival = lead.arrival_date ? new Date(lead.arrival_date) : null;
    const month =
      arrival && !Number.isNaN(arrival.getTime())
        ? arrival.toISOString().slice(0, 7)
        : 'unscheduled';
    const f = forecast.get(month) ?? {
      month,
      count: 0,
      expected_revenue: 0,
      weighted_revenue: 0,
      won_revenue: 0,
    };
    f.count += 1;
    if (lead.state === 'won') {
      f.won_revenue = round2(f.won_revenue + expected);
    } else {
      f.expected_revenue = round2(f.expected_revenue + expected);
    }
    f.weighted_revenue = round2(f.weighted_revenue + weighted);
    forecast.set(month, f);
  }

  const closed = totals.won_count + totals.lost_count;
  return {
    stages: [...rows.values()],
    totals,
    win_rate: closed === 0 ? 0 : round2((totals.won_count / closed) * 100),
    forecast: [...forecast.values()].sort((a, b) =>
      a.month.localeCompare(b.month),
    ),
  };
}

/** Étapes créées par `POST crm/setup`. */
export const DEFAULT_CRM_STAGES = [
  {
    name: 'Nouveau',
    sequence: 10,
    probability: 10,
    is_won: false,
    is_lost: false,
    fold: false,
  },
  {
    name: 'Qualifié',
    sequence: 20,
    probability: 30,
    is_won: false,
    is_lost: false,
    fold: false,
  },
  {
    name: 'Proposition envoyée',
    sequence: 30,
    probability: 50,
    is_won: false,
    is_lost: false,
    fold: false,
  },
  {
    name: 'Négociation',
    sequence: 40,
    probability: 70,
    is_won: false,
    is_lost: false,
    fold: false,
  },
  {
    name: 'Gagné',
    sequence: 90,
    probability: 100,
    is_won: true,
    is_lost: false,
    fold: false,
  },
  {
    name: 'Perdu',
    sequence: 100,
    probability: 0,
    is_won: false,
    is_lost: true,
    fold: true,
  },
];
