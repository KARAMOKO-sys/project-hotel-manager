import { randomBytes } from 'crypto';
import {
  decryptWithKey,
  encryptWithKey,
  generateSigningSecret,
  resolveEncryptionKey,
  secretHint,
} from './secret-cipher.service';

const envOf = (values: Record<string, string>) => (key: string) => values[key];

describe('SecretCipher', () => {
  const key = randomBytes(32);

  it('chiffre puis déchiffre (aller-retour) avec un IV aléatoire', () => {
    const a = encryptWithKey(key, 'whsec_secret');
    const b = encryptWithKey(key, 'whsec_secret');
    expect(a).not.toEqual(b);
    expect(a).not.toContain('whsec_secret');
    expect(decryptWithKey(key, a)).toBe('whsec_secret');
  });

  it('détecte toute altération du chiffré, du tag ou de la clé', () => {
    const payload = encryptWithKey(key, 'whsec_secret');
    const [version, iv, tag, data] = payload.split(':');
    const flipped = Buffer.from(data, 'base64');
    flipped[0] ^= 0xff;
    expect(() =>
      decryptWithKey(
        key,
        [version, iv, tag, flipped.toString('base64')].join(':'),
      ),
    ).toThrow();
    const badTag = Buffer.from(tag, 'base64');
    badTag[0] ^= 0x01;
    expect(() =>
      decryptWithKey(
        key,
        [version, iv, badTag.toString('base64'), data].join(':'),
      ),
    ).toThrow();
    expect(() => decryptWithKey(randomBytes(32), payload)).toThrow();
    expect(() => decryptWithKey(key, 'v2:a:b:c')).toThrow();
  });

  describe('resolveEncryptionKey', () => {
    it('lit une clé de 32 octets en base64 ou en hexadécimal', () => {
      const raw = randomBytes(32);
      expect(
        resolveEncryptionKey(
          envOf({ INTEGRATION_ENCRYPTION_KEY: raw.toString('base64') }),
        ),
      ).toEqual(raw);
      expect(
        resolveEncryptionKey(
          envOf({ INTEGRATION_ENCRYPTION_KEY: raw.toString('hex') }),
        ),
      ).toEqual(raw);
    });

    it('lève une erreur en production si la clé est absente ou invalide', () => {
      expect(() =>
        resolveEncryptionKey(
          envOf({ NODE_ENV: 'production', JWT_SECRET: 'x' }),
        ),
      ).toThrow(/INTEGRATION_ENCRYPTION_KEY/);
      expect(() =>
        resolveEncryptionKey(
          envOf({
            NODE_ENV: 'production',
            INTEGRATION_ENCRYPTION_KEY: 'trop-court',
          }),
        ),
      ).toThrow(/INTEGRATION_ENCRYPTION_KEY/);
    });

    it('dérive une clé de JWT_SECRET hors production avec un avertissement', () => {
      const warn = jest.fn();
      const k1 = resolveEncryptionKey(envOf({ JWT_SECRET: 'abc' }), { warn });
      const k2 = resolveEncryptionKey(envOf({ JWT_SECRET: 'abc' }));
      const k3 = resolveEncryptionKey(envOf({ JWT_SECRET: 'def' }));
      expect(k1).toHaveLength(32);
      expect(k1).toEqual(k2);
      expect(k1).not.toEqual(k3);
      expect(warn).toHaveBeenCalled();
    });
  });

  it('génère des secrets distincts et un indice masqué', () => {
    const s = generateSigningSecret();
    expect(s).toMatch(/^whsec_[A-Za-z0-9_-]{43}$/);
    expect(generateSigningSecret()).not.toBe(s);
    expect(secretHint('whsec_abcdef1234')).toBe('••••1234');
  });
});
