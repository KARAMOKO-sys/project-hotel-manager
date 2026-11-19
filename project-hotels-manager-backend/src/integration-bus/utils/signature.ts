import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Signature des messages de l'ESB (schéma `pleasantstay_v1`).
 *
 * `X-PleasantStay-Signature: v1=<hex HMAC-SHA256(secret, "<timestamp>.<corps brut>")>`
 * avec `X-PleasantStay-Timestamp` = secondes Unix. Plusieurs signatures
 * peuvent être séparées par des virgules (rotation de secret).
 */

export type RawBody = string | Buffer;

/** HMAC-SHA256 hexadécimal. */
export function hmacSha256Hex(secret: string, data: RawBody): string {
  return createHmac('sha256', secret).update(data).digest('hex');
}

/** Contenu signé du schéma v1 : `${timestamp}.${rawBody}`. */
export function signaturePayload(
  timestamp: number | string,
  body: RawBody,
): Buffer {
  const prefix = Buffer.from(`${timestamp}.`, 'utf8');
  const raw = typeof body === 'string' ? Buffer.from(body, 'utf8') : body;
  return Buffer.concat([prefix, raw]);
}

/** Valeur de l'en-tête `X-PleasantStay-Signature`. */
export function signV1(
  secret: string,
  timestamp: number,
  body: RawBody,
): string {
  return `v1=${hmacSha256Hex(secret, signaturePayload(timestamp, body))}`;
}

/** Comparaison en temps constant de deux chaînes hexadécimales. */
export function safeEqualHex(
  expectedHex: string,
  receivedHex: string,
): boolean {
  if (!/^[0-9a-f]+$/i.test(receivedHex)) return false;
  const expected = Buffer.from(expectedHex.toLowerCase(), 'hex');
  const received = Buffer.from(receivedHex.toLowerCase(), 'hex');
  if (expected.length !== received.length || expected.length === 0) {
    return false;
  }
  return timingSafeEqual(expected, received);
}

export type SignatureFailure =
  | 'missing_signature'
  | 'missing_timestamp'
  | 'invalid_timestamp'
  | 'stale_timestamp'
  | 'invalid_signature';

export type SignatureCheck =
  { valid: true } | { valid: false; reason: SignatureFailure };

/**
 * Vérifie une signature `pleasantstay_v1` : horodatage dans la tolérance
 * (protection contre le rejeu) puis HMAC en temps constant.
 */
export function verifyV1(params: {
  secret: string;
  body: RawBody;
  timestampHeader: string | undefined;
  signatureHeader: string | undefined;
  toleranceSeconds: number;
  nowSeconds?: number;
}): SignatureCheck {
  const { secret, body, timestampHeader, signatureHeader } = params;
  if (!signatureHeader) return { valid: false, reason: 'missing_signature' };
  if (!timestampHeader) return { valid: false, reason: 'missing_timestamp' };
  if (!/^\d{1,12}$/.test(timestampHeader.trim())) {
    return { valid: false, reason: 'invalid_timestamp' };
  }
  const timestamp = Number(timestampHeader.trim());
  const now = params.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > params.toleranceSeconds) {
    return { valid: false, reason: 'stale_timestamp' };
  }
  const expected = hmacSha256Hex(secret, signaturePayload(timestamp, body));
  const candidates = signatureHeader
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.startsWith('v1='))
    .map((part) => part.slice(3));
  const ok = candidates.some((candidate) => safeEqualHex(expected, candidate));
  return ok ? { valid: true } : { valid: false, reason: 'invalid_signature' };
}

/**
 * Vérifie une signature HMAC-SHA256 hexadécimale du corps brut seul, portée
 * par un en-tête configurable (avec préfixe optionnel, ex. `sha256=`).
 * Pas de protection contre le rejeu autre que la déduplication par identifiant.
 */
export function verifyHexHeader(params: {
  secret: string;
  body: RawBody;
  signatureHeader: string | undefined;
  prefix?: string;
}): SignatureCheck {
  let received = params.signatureHeader?.trim();
  if (!received) return { valid: false, reason: 'missing_signature' };
  if (params.prefix) {
    if (!received.startsWith(params.prefix)) {
      return { valid: false, reason: 'invalid_signature' };
    }
    received = received.slice(params.prefix.length);
  }
  const expected = hmacSha256Hex(params.secret, params.body);
  return safeEqualHex(expected, received)
    ? { valid: true }
    : { valid: false, reason: 'invalid_signature' };
}
