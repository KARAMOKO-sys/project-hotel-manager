/** Délai de base avant la première nouvelle tentative. */
export const BACKOFF_BASE_MS = 30_000;
/** Délai maximal entre deux tentatives. */
export const BACKOFF_MAX_MS = 6 * 3600_000;
/** Amplitude de la gigue (± 20 %). */
export const BACKOFF_JITTER_RATIO = 0.2;

/**
 * Délai avant la prochaine tentative après `attempts` tentatives échouées :
 * `30 s × 2^(attempts-1)`, plafonné à 6 h, avec une gigue de ± 20 %
 * (toujours ≤ 6 h) pour éviter que tous les messages repartent ensemble.
 *
 * `random` est injectable pour les tests (doit renvoyer une valeur dans [0, 1[).
 */
export function computeBackoffMs(
  attempts: number,
  random: () => number = Math.random,
  baseMs = BACKOFF_BASE_MS,
  maxMs = BACKOFF_MAX_MS,
): number {
  const exponent = Math.max(0, Math.floor(attempts) - 1);
  // 2^30 dépasse largement le plafond : on borne l'exposant pour éviter Infinity.
  const raw = baseMs * Math.pow(2, Math.min(exponent, 30));
  const capped = Math.min(raw, maxMs);
  const jitter = 1 - BACKOFF_JITTER_RATIO + 2 * BACKOFF_JITTER_RATIO * random();
  return Math.max(1_000, Math.min(Math.round(capped * jitter), maxMs));
}
