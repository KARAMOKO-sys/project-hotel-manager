import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';

/** Arrondi monétaire à 2 décimales. */
export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Arrondi des quantités (3 décimales : kg, litres…). */
export function roundQty(value: number): number {
  return Math.round((value + Number.EPSILON) * 1000) / 1000;
}

/**
 * Coût moyen pondéré après une entrée en stock.
 * Si le stock existant est nul ou négatif, le coût de l'entrée s'impose.
 */
export function weightedAverageCost(
  currentQty: number,
  currentCost: number,
  incomingQty: number,
  incomingCost: number,
): number {
  if (incomingQty <= 0) return roundMoney(currentCost);
  if (currentQty <= 0) return roundMoney(incomingCost);
  const totalQty = currentQty + incomingQty;
  return roundMoney(
    (currentQty * currentCost + incomingQty * incomingCost) / totalQty,
  );
}

/**
 * Vrai si une sortie fait passer le stock sous le seuil minimum
 * (franchissement uniquement, pour ne pas répéter l'alerte).
 */
export function crossesBelowThreshold(
  before: number,
  after: number,
  reorderMin: number,
): boolean {
  if (!reorderMin || reorderMin <= 0) return false;
  return before >= reorderMin && after < reorderMin;
}

/** Quantité à commander pour revenir au stock maximum. */
export function reorderQuantity(
  available: number,
  reorderMin: number,
  reorderMax: number,
  incoming = 0,
): number {
  const target = reorderMax > 0 ? reorderMax : reorderMin;
  return Math.max(0, roundQty(target - available - incoming));
}

/** Convertit une chaîne en ObjectId (400 si invalide). */
export function toObjectId(
  value: string | Types.ObjectId,
  label = 'Identifiant',
): Types.ObjectId {
  if (value instanceof Types.ObjectId) return value;
  if (typeof value !== 'string' || !Types.ObjectId.isValid(value)) {
    throw new BadRequestException(`${label} invalide`);
  }
  return new Types.ObjectId(value);
}

/** Échappe une saisie utilisateur avant usage dans `$regex`. */
export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Erreur Mongo de clé dupliquée. */
export function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: number }).code === 11000
  );
}
