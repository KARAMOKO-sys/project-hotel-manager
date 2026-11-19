import { createHmac } from 'crypto';
import {
  isValidEventPattern,
  matchesAnyPattern,
  matchesEventPattern,
} from './pattern-matcher';
import { BACKOFF_MAX_MS, computeBackoffMs } from './backoff';
import { safeEqualHex, signV1, verifyHexHeader, verifyV1 } from './signature';
import { validateCustomHeaders } from './custom-headers';

describe('pattern-matcher', () => {
  it('correspond aux noms exacts, préfixes et joker', () => {
    expect(
      matchesEventPattern('billing.invoice.paid', 'billing.invoice.paid'),
    ).toBe(true);
    expect(matchesEventPattern('billing.invoice.paid', 'billing.*')).toBe(true);
    expect(
      matchesEventPattern('billing.invoice.paid', 'billing.invoice.*'),
    ).toBe(true);
    expect(matchesEventPattern('billing.invoice.paid', '*')).toBe(true);
    expect(matchesEventPattern('BILLING.Invoice.paid', 'billing.*')).toBe(true);
  });

  it('ne correspond pas aux noms voisins', () => {
    expect(matchesEventPattern('billing.invoice.paid', 'billing.invoice')).toBe(
      false,
    );
    expect(matchesEventPattern('billingx.invoice.paid', 'billing.*')).toBe(
      false,
    );
    expect(matchesEventPattern('billing', 'billing.*')).toBe(false);
    expect(matchesEventPattern('hotel.reservation.created', 'billing.*')).toBe(
      false,
    );
    expect(matchesEventPattern('', '*')).toBe(false);
  });

  it('teste plusieurs noms (sujet d’automatisation) et motifs', () => {
    expect(
      matchesAnyPattern(['hotel.reservation.created', 'crm.vip'], ['crm.*']),
    ).toBe(true);
    expect(
      matchesAnyPattern(['hotel.reservation.created', undefined], ['crm.*']),
    ).toBe(false);
    expect(matchesAnyPattern(['x'], [])).toBe(false);
  });

  it('valide la syntaxe des motifs', () => {
    expect(isValidEventPattern('*')).toBe(true);
    expect(isValidEventPattern('billing.*')).toBe(true);
    expect(isValidEventPattern('hotel.reservation.checked_in')).toBe(true);
    expect(isValidEventPattern('billing*')).toBe(false);
    expect(isValidEventPattern('*.paid')).toBe(false);
    expect(isValidEventPattern('a..b')).toBe(false);
  });
});

describe('computeBackoffMs', () => {
  const mid = () => 0.5; // gigue nulle

  it('double à chaque tentative à partir de 30 s', () => {
    expect(computeBackoffMs(1, mid)).toBe(30_000);
    expect(computeBackoffMs(2, mid)).toBe(60_000);
    expect(computeBackoffMs(3, mid)).toBe(120_000);
    expect(computeBackoffMs(5, mid)).toBe(480_000);
  });

  it('est plafonné à 6 h, même avec gigue haute ou nombre énorme', () => {
    expect(computeBackoffMs(20, mid)).toBe(BACKOFF_MAX_MS);
    expect(computeBackoffMs(20, () => 0.999)).toBeLessThanOrEqual(
      BACKOFF_MAX_MS,
    );
    expect(computeBackoffMs(10_000, mid)).toBe(BACKOFF_MAX_MS);
  });

  it('applique une gigue de ± 20 %', () => {
    expect(computeBackoffMs(1, () => 0)).toBe(24_000);
    expect(computeBackoffMs(1, () => 0.999999)).toBeCloseTo(36_000, -1);
  });
});

describe('signature', () => {
  const secret = 'whsec_test_secret_1234567890';
  const body = JSON.stringify({ id: 'evt_1', name: 'billing.invoice.paid' });
  const now = 1_800_000_000;

  it('signe selon HMAC-SHA256(secret, "ts.corps")', () => {
    const expected = createHmac('sha256', secret)
      .update(`${now}.${body}`)
      .digest('hex');
    expect(signV1(secret, now, body)).toBe(`v1=${expected}`);
  });

  it('vérifie une signature valide (et accepte plusieurs signatures)', () => {
    const sig = signV1(secret, now, body);
    expect(
      verifyV1({
        secret,
        body,
        timestampHeader: String(now),
        signatureHeader: sig,
        toleranceSeconds: 300,
        nowSeconds: now + 10,
      }),
    ).toEqual({ valid: true });
    expect(
      verifyV1({
        secret,
        body: Buffer.from(body),
        timestampHeader: String(now),
        signatureHeader: `v1=${'0'.repeat(64)}, ${sig}`,
        toleranceSeconds: 300,
        nowSeconds: now,
      }),
    ).toEqual({ valid: true });
  });

  it('rejette un corps altéré, un mauvais secret, un horodatage périmé', () => {
    const sig = signV1(secret, now, body);
    const base = {
      timestampHeader: String(now),
      signatureHeader: sig,
      toleranceSeconds: 300,
      nowSeconds: now,
    };
    expect(
      verifyV1({ ...base, secret, body: body.replace('paid', 'void') }),
    ).toEqual({ valid: false, reason: 'invalid_signature' });
    expect(
      verifyV1({ ...base, secret: 'autre-secret-xxxxxxxx', body }),
    ).toEqual({ valid: false, reason: 'invalid_signature' });
    expect(verifyV1({ ...base, secret, body, nowSeconds: now + 301 })).toEqual({
      valid: false,
      reason: 'stale_timestamp',
    });
    expect(verifyV1({ ...base, secret, body, nowSeconds: now - 301 })).toEqual({
      valid: false,
      reason: 'stale_timestamp',
    });
    // L'horodatage fait partie du contenu signé.
    expect(
      verifyV1({ ...base, secret, body, timestampHeader: String(now + 1) }),
    ).toEqual({ valid: false, reason: 'invalid_signature' });
  });

  it('rejette les en-têtes absents ou malformés', () => {
    const base = { secret, body, toleranceSeconds: 300, nowSeconds: now };
    expect(
      verifyV1({
        ...base,
        timestampHeader: String(now),
        signatureHeader: undefined,
      }).valid,
    ).toBe(false);
    expect(
      verifyV1({
        ...base,
        timestampHeader: undefined,
        signatureHeader: 'v1=ab',
      }),
    ).toEqual({ valid: false, reason: 'missing_timestamp' });
    expect(
      verifyV1({ ...base, timestampHeader: 'abc', signatureHeader: 'v1=ab' }),
    ).toEqual({ valid: false, reason: 'invalid_timestamp' });
    expect(
      verifyV1({
        ...base,
        timestampHeader: String(now),
        signatureHeader: 'v0=zz',
      }),
    ).toEqual({ valid: false, reason: 'invalid_signature' });
  });

  it('vérifie le schéma hmac_sha256_hex_header avec préfixe', () => {
    const hex = createHmac('sha256', secret).update(body).digest('hex');
    expect(verifyHexHeader({ secret, body, signatureHeader: hex })).toEqual({
      valid: true,
    });
    expect(
      verifyHexHeader({
        secret,
        body,
        signatureHeader: `sha256=${hex}`,
        prefix: 'sha256=',
      }),
    ).toEqual({ valid: true });
    expect(
      verifyHexHeader({ secret, body, signatureHeader: hex, prefix: 'sha256=' })
        .valid,
    ).toBe(false);
    expect(
      verifyHexHeader({ secret, body: `${body} `, signatureHeader: hex }).valid,
    ).toBe(false);
    expect(
      verifyHexHeader({ secret, body, signatureHeader: undefined }).valid,
    ).toBe(false);
  });

  it('compare en temps constant sans planter sur des longueurs différentes', () => {
    expect(safeEqualHex('abcd', 'abcd')).toBe(true);
    expect(safeEqualHex('abcd', 'abc')).toBe(false);
    expect(safeEqualHex('abcd', 'zzzz')).toBe(false);
    expect(safeEqualHex('abcd', '')).toBe(false);
  });
});

describe('validateCustomHeaders', () => {
  it('accepte des en-têtes ordinaires', () => {
    expect(
      validateCustomHeaders({ 'X-Tenant': 'abc', 'X-Version': 2 }),
    ).toEqual({
      ok: true,
      headers: { 'X-Tenant': 'abc', 'X-Version': '2' },
    });
  });

  it.each([
    'Authorization',
    'x-pleasantstay-signature',
    'X-PleasantStay-Timestamp',
    'Content-Type',
    'Host',
  ])('refuse l’en-tête réservé %s', (name) => {
    expect(validateCustomHeaders({ [name]: 'x' }).ok).toBe(false);
  });

  it('refuse les injections CRLF et noms invalides', () => {
    expect(validateCustomHeaders({ 'X-A': 'a\r\nX-B: b' }).ok).toBe(false);
    expect(validateCustomHeaders({ 'X A': 'a' }).ok).toBe(false);
    expect(validateCustomHeaders(['a']).ok).toBe(false);
  });
});
