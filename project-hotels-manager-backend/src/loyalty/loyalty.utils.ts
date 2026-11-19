import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { LoyaltyTier } from '../base-entities/enums/loyalty-tier.enum';

/** Fonctions pures de la fidélité (gain, niveaux, valeur, FIFO). */

export function toObjectId(value: unknown, field: string): Types.ObjectId {
  if (value instanceof Types.ObjectId) return value;
  const text = typeof value === 'string' ? value : '';
  if (!Types.ObjectId.isValid(text)) {
    throw new BadRequestException(`Identifiant invalide pour « ${field} »`);
  }
  return new Types.ObjectId(text);
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

/** Ordre des niveaux (du plus bas au plus haut). */
export const TIER_ORDER: LoyaltyTier[] = [
  LoyaltyTier.BRONZE,
  LoyaltyTier.SILVER,
  LoyaltyTier.GOLD,
  LoyaltyTier.PLATINUM,
];

export interface TierRule {
  tier: LoyaltyTier;
  min_lifetime_points: number;
  earn_multiplier: number;
}

export interface EarnRules {
  /** Montant (devise du programme) donnant droit à `points_per_unit` points. */
  earn_unit_amount: number;
  points_per_unit: number;
  tiers?: TierRule[];
}

/**
 * Niveau correspondant à un cumul de points : le plus haut seuil atteint.
 * Sans règle, ou sous le premier seuil, le niveau est `bronze`.
 */
export function resolveTier(
  tiers: TierRule[] | undefined,
  lifetimePoints: number,
): LoyaltyTier {
  let best: TierRule | undefined;
  for (const rule of tiers ?? []) {
    if (lifetimePoints >= rule.min_lifetime_points) {
      if (!best || rule.min_lifetime_points > best.min_lifetime_points)
        best = rule;
    }
  }
  return best?.tier ?? LoyaltyTier.BRONZE;
}

/** Multiplicateur de gain d'un niveau (1 par défaut). */
export function tierMultiplier(
  tiers: TierRule[] | undefined,
  tier: LoyaltyTier,
): number {
  const rule = (tiers ?? []).find((t) => t.tier === tier);
  return rule && rule.earn_multiplier > 0 ? rule.earn_multiplier : 1;
}

/**
 * Points gagnés pour un montant : ⌊ montant / unité × points/unité ×
 * multiplicateur du niveau ⌋. Ex. 1 pt / 1 000 XOF, Or ×1,5 :
 * 125 000 XOF → ⌊125 × 1,5⌋ = 187 points.
 */
export function computeEarnPoints(
  amount: number,
  rules: EarnRules,
  tier: LoyaltyTier,
): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  if (!(rules.earn_unit_amount > 0) || !(rules.points_per_unit > 0)) return 0;
  const raw =
    (amount / rules.earn_unit_amount) *
    rules.points_per_unit *
    tierMultiplier(rules.tiers, tier);
  // Tolérance d'arrondi flottant (ex. 2.9999999 → 3).
  return Math.max(0, Math.floor(raw + 1e-9));
}

/** Valeur monétaire de points (devise du programme). */
export function pointsValue(points: number, pointValue: number): number {
  return round2(points * pointValue);
}

/** Préconditions d'utilisation (hors solde, vérifié atomiquement). */
export function assertRedeemable(
  points: number,
  minRedeemPoints: number,
  balance?: number,
): void {
  if (!Number.isInteger(points) || points <= 0) {
    throw new BadRequestException(
      'Le nombre de points doit être un entier positif',
    );
  }
  if (points < minRedeemPoints) {
    throw new BadRequestException(
      `Minimum d'utilisation : ${minRedeemPoints} points`,
    );
  }
  if (balance !== undefined && points > balance) {
    throw new BadRequestException(
      `Solde insuffisant : ${balance} points disponibles`,
    );
  }
}

/** Date d'expiration des points gagnés à `from` (aucune si 0). */
export function expiryDate(
  from: Date,
  months: number | undefined,
): Date | undefined {
  if (!months || months <= 0) return undefined;
  const d = new Date(from);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

export interface FifoLot {
  _id: unknown;
  remaining_points: number;
}

/**
 * Répartit une consommation de `points` sur les lots de gain du plus ancien
 * au plus récent (FIFO). Les lots doivent être fournis triés.
 */
export function planFifoConsumption(
  lots: FifoLot[],
  points: number,
): { allocations: { lot_id: unknown; points: number }[]; uncovered: number } {
  let left = points;
  const allocations: { lot_id: unknown; points: number }[] = [];
  for (const lot of lots) {
    if (left <= 0) break;
    const take = Math.min(left, Math.max(0, lot.remaining_points));
    if (take > 0) {
      allocations.push({ lot_id: lot._id, points: take });
      left -= take;
    }
  }
  return { allocations, uncovered: left };
}

/** Montant d'un événement réservation / POS (objet monnaie ou nombre). */
export function readAmount(value: unknown): {
  amount: number;
  currency?: string;
} {
  if (typeof value === 'number') return { amount: value };
  if (value && typeof value === 'object') {
    const v = value as { amount?: unknown; currency?: unknown };
    const amount = typeof v.amount === 'number' ? v.amount : Number(v.amount);
    return {
      amount: Number.isFinite(amount) ? amount : 0,
      currency: typeof v.currency === 'string' ? v.currency : undefined,
    };
  }
  const n = Number(value);
  return { amount: Number.isFinite(n) ? n : 0 };
}

/** Échappe une saisie utilisateur avant usage dans un `$regex`. */
export function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
