/**
 * Convertit une durée lisible (`15m`, `30d`, `12h`, `45s`, `3600`) en secondes.
 *
 * Utilisé pour lire les durées de vie des jetons depuis les variables
 * d'environnement. Une valeur numérique seule est interprétée en secondes.
 * En cas de format invalide, la valeur par défaut est renvoyée.
 */
export function parseDurationToSeconds(
  value: string | number | undefined | null,
  fallbackSeconds: number,
): number {
  if (value === undefined || value === null || value === '') {
    return fallbackSeconds;
  }
  if (typeof value === 'number') {
    return value > 0 ? Math.floor(value) : fallbackSeconds;
  }

  const match = /^\s*(\d+)\s*(ms|s|m|h|d|w)?\s*$/i.exec(value);
  if (!match) {
    return fallbackSeconds;
  }

  const amount = Number(match[1]);
  const unit = (match[2] ?? 's').toLowerCase();
  const multipliers: Record<string, number> = {
    ms: 0.001,
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
    w: 604800,
  };
  const seconds = Math.floor(amount * multipliers[unit]);
  return seconds > 0 ? seconds : fallbackSeconds;
}
