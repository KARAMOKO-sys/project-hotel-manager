/**
 * Validation des en-têtes personnalisés d'un point de terminaison.
 *
 * Interdits : nos en-têtes de signature (`X-PleasantStay-*`), les en-têtes
 * gérés par le transport (Content-Type, Host…) et `Authorization` (les
 * valeurs sont stockées en clair et renvoyées par l'API : l'authentification
 * repose sur la signature HMAC).
 */
const RESERVED_HEADERS = new Set([
  'authorization',
  'proxy-authorization',
  'cookie',
  'content-type',
  'content-length',
  'content-encoding',
  'transfer-encoding',
  'connection',
  'keep-alive',
  'host',
  'user-agent',
  'expect',
  'upgrade',
  'te',
  'trailer',
]);

const TOKEN_REGEX = /^[A-Za-z0-9!#$%&'*+.^_`|~-]{1,100}$/;
const MAX_HEADERS = 20;
const MAX_VALUE_LENGTH = 1000;

export type HeadersCheck =
  { ok: true; headers: Record<string, string> } | { ok: false; reason: string };

export function validateCustomHeaders(input: unknown): HeadersCheck {
  if (input === undefined || input === null) return { ok: true, headers: {} };
  if (typeof input !== 'object' || Array.isArray(input)) {
    return {
      ok: false,
      reason: 'Les en-têtes doivent être un objet clé/valeur',
    };
  }
  const entries = Object.entries(input as Record<string, unknown>);
  if (entries.length > MAX_HEADERS) {
    return {
      ok: false,
      reason: `${MAX_HEADERS} en-têtes personnalisés au maximum`,
    };
  }
  const headers: Record<string, string> = {};
  const seen = new Set<string>();
  for (const [name, value] of entries) {
    if (!TOKEN_REGEX.test(name)) {
      return { ok: false, reason: `Nom d’en-tête invalide : ${name}` };
    }
    const lower = name.toLowerCase();
    if (RESERVED_HEADERS.has(lower) || lower.startsWith('x-pleasantstay-')) {
      return { ok: false, reason: `En-tête réservé non modifiable : ${name}` };
    }
    if (seen.has(lower)) {
      return { ok: false, reason: `En-tête en double : ${name}` };
    }
    seen.add(lower);
    if (typeof value !== 'string' && typeof value !== 'number') {
      return { ok: false, reason: `Valeur d’en-tête invalide : ${name}` };
    }
    const text = String(value);
    if (text.length > MAX_VALUE_LENGTH || /[\r\n\0]/.test(text)) {
      return { ok: false, reason: `Valeur d’en-tête invalide : ${name}` };
    }
    headers[name] = text;
  }
  return { ok: true, headers };
}
