/**
 * Correspondance entre noms d'événements et motifs d'abonnement.
 *
 * Motifs acceptés :
 * - `*` : tous les événements ;
 * - `billing.*` : tout événement dont le nom commence par `billing.` ;
 * - `billing.invoice.paid` : nom exact.
 */
export const EVENT_PATTERN_REGEX = /^(\*|[a-z0-9_-]+(\.[a-z0-9_-]+)*(\.\*)?)$/i;

/** Vrai si le motif a une syntaxe valide. */
export function isValidEventPattern(pattern: string): boolean {
  return typeof pattern === 'string' && EVENT_PATTERN_REGEX.test(pattern);
}

/** Vrai si `name` correspond au motif `pattern`. */
export function matchesEventPattern(name: string, pattern: string): boolean {
  if (!name || !pattern) return false;
  const normalizedName = name.toLowerCase();
  const normalizedPattern = pattern.trim().toLowerCase();
  if (normalizedPattern === '*') return true;
  if (normalizedPattern.endsWith('.*')) {
    const prefix = normalizedPattern.slice(0, -1); // garde le point final
    return (
      normalizedName.startsWith(prefix) && normalizedName.length > prefix.length
    );
  }
  return normalizedName === normalizedPattern;
}

/** Vrai si l'un des noms correspond à l'un des motifs. */
export function matchesAnyPattern(
  names: Array<string | undefined>,
  patterns: string[] | undefined,
): boolean {
  if (!patterns?.length) return false;
  return names.some(
    (name) =>
      !!name && patterns.some((pattern) => matchesEventPattern(name, pattern)),
  );
}
