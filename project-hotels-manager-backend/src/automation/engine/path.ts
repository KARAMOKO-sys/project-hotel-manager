/** Segments interdits (protection contre l'accès au prototype). */
const FORBIDDEN_SEGMENTS = new Set(['__proto__', 'prototype', 'constructor']);

/** Chemin pointé valide : `payload.total_amount`, `record.id`, `payload.items.0.qty`. */
export const PATH_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z0-9_]+){0,15}$/;

/** Vrai si le chemin est syntaxiquement valide et sans segment interdit. */
export function isValidPath(path: unknown): path is string {
  return (
    typeof path === 'string' &&
    path.length <= 200 &&
    PATH_PATTERN.test(path) &&
    !path.split('.').some((segment) => FORBIDDEN_SEGMENTS.has(segment))
  );
}

/**
 * Lit une valeur par chemin pointé, uniquement dans les propriétés propres
 * des objets (jamais le prototype). `undefined` si le chemin est absent.
 */
export function getPath(source: unknown, path: string): unknown {
  if (!isValidPath(path)) return undefined;
  let current: unknown = source;
  for (const segment of path.split('.')) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== 'object') return undefined;
    if (!Object.prototype.hasOwnProperty.call(current, segment)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}
