import { getPath } from './path';

/** Longueur maximale d'un texte rendu. */
export const MAX_RENDERED_LENGTH = 10000;

/** `{{ chemin.pointé }}` — aucune autre syntaxe n'est interprétée. */
const PLACEHOLDER = /\{\{\s*([A-Za-z0-9_.]{1,200})\s*\}\}/g;

function stringify(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return '';
    }
  }
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  ) {
    return String(value);
  }
  return '';
}

/**
 * Remplace les `{{ chemin }}` par les valeurs lues dans `context`.
 *
 * Sûr : simple lecture de propriétés propres (pas d'évaluation de code, pas
 * d'accès au prototype), passe unique (une valeur contenant `{{…}}` n'est
 * pas réinterprétée), chemin absent → chaîne vide, résultat tronqué.
 */
export function renderTemplate(template: string, context: unknown): string {
  if (typeof template !== 'string') return '';
  return template
    .replace(PLACEHOLDER, (_match, path: string) =>
      stringify(getPath(context, path)),
    )
    .slice(0, MAX_RENDERED_LENGTH);
}

/** Vrai si le texte contient au moins un `{{ chemin }}`. */
export function hasPlaceholder(text: string): boolean {
  return new RegExp(PLACEHOLDER.source).test(text);
}
