import {
  checkResolvedHost,
  checkUrlStatic,
  expandIPv6,
  isBlockedIp,
} from './ssrf-guard';

const prod = { isProduction: true, allowPrivate: false };
const dev = { isProduction: false, allowPrivate: false };
const devPrivate = { isProduction: false, allowPrivate: true };

describe('ssrf-guard', () => {
  describe('isBlockedIp', () => {
    it.each([
      '127.0.0.1',
      '127.255.255.254',
      '10.0.0.1',
      '10.255.255.255',
      '172.16.0.1',
      '172.31.255.255',
      '192.168.1.10',
      '169.254.169.254',
      '169.254.0.1',
      '0.0.0.0',
      '100.64.0.1',
      '224.0.0.1',
      '255.255.255.255',
      '::1',
      '::',
      'fc00::1',
      'fd12:3456:789a::1',
      'fe80::1',
      'febf::1',
      '::ffff:127.0.0.1',
      '::ffff:10.1.2.3',
      '::ffff:7f00:1',
      '::ffff:a9fe:a9fe',
      'ff02::1',
    ])('bloque %s', (ip) => {
      expect(isBlockedIp(ip)).toBe(true);
    });

    it.each([
      '8.8.8.8',
      '1.1.1.1',
      '172.15.255.255',
      '172.32.0.1',
      '192.169.0.1',
      '2606:4700:4700::1111',
      '::ffff:8.8.8.8',
    ])('autorise %s', (ip) => {
      expect(isBlockedIp(ip)).toBe(false);
    });

    it('refuse les chaînes non IP', () => {
      expect(isBlockedIp('example.com')).toBe(true);
    });

    it('développe les IPv6', () => {
      expect(expandIPv6('::1')).toEqual([0, 0, 0, 0, 0, 0, 0, 1]);
      expect(expandIPv6('2001:db8::8a2e:370:7334')).toEqual([
        0x2001, 0xdb8, 0, 0, 0, 0x8a2e, 0x370, 0x7334,
      ]);
      expect(expandIPv6('::ffff:1.2.3.4')).toEqual([
        0, 0, 0, 0, 0, 0xffff, 0x102, 0x304,
      ]);
      expect(expandIPv6('1::2::3')).toBeNull();
    });
  });

  describe('checkUrlStatic', () => {
    it('exige https en production, accepte http hors production', () => {
      expect(checkUrlStatic('http://example.com/hook', prod).ok).toBe(false);
      expect(checkUrlStatic('https://example.com/hook', prod).ok).toBe(true);
      expect(checkUrlStatic('http://example.com/hook', dev).ok).toBe(true);
    });

    it('refuse les schémas non http(s) et les URL invalides', () => {
      expect(checkUrlStatic('ftp://example.com', dev).ok).toBe(false);
      expect(checkUrlStatic('file:///etc/passwd', dev).ok).toBe(false);
      expect(checkUrlStatic('gopher://x', dev).ok).toBe(false);
      expect(checkUrlStatic('pas une url', dev).ok).toBe(false);
    });

    it('refuse les identifiants dans l’URL, même en mode privé autorisé', () => {
      expect(checkUrlStatic('https://user:pass@example.com', prod).ok).toBe(
        false,
      );
      expect(checkUrlStatic('https://user@example.com', prod).ok).toBe(false);
      expect(checkUrlStatic('http://user:pass@localhost', devPrivate).ok).toBe(
        false,
      );
    });

    it.each([
      'https://127.0.0.1/x',
      'https://[::1]/x',
      'https://169.254.169.254/latest/meta-data',
      'https://10.0.0.5',
      'https://192.168.0.1:8443',
      'https://172.20.1.1',
      'https://0.0.0.0',
      'https://localhost:3000',
      'https://api.localhost',
      'https://metadata.google.internal',
      'https://2130706433', // 127.0.0.1 en décimal, normalisé par WHATWG URL
      'https://0x7f.0.0.1',
      'https://[fe80::1]',
      'https://[::ffff:127.0.0.1]',
    ])('refuse %s', (url) => {
      expect(checkUrlStatic(url, prod).ok).toBe(false);
    });

    it('autorise les adresses privées avec INTEGRATION_ALLOW_PRIVATE_URLS', () => {
      expect(checkUrlStatic('http://localhost:4000/hook', devPrivate).ok).toBe(
        true,
      );
      expect(checkUrlStatic('http://127.0.0.1:4000/hook', devPrivate).ok).toBe(
        true,
      );
    });
  });

  describe('checkResolvedHost', () => {
    const lookup = (map: Record<string, string[]>) =>
      jest.fn((host: string) =>
        map[host]
          ? Promise.resolve(
              map[host].map((address) => ({
                address,
                family: address.includes(':') ? 6 : 4,
              })),
            )
          : Promise.reject(new Error('ENOTFOUND')),
      );

    it('refuse un nom d’hôte qui résout vers une adresse privée (une seule suffit)', async () => {
      const fn = lookup({
        'evil.example': ['93.184.216.34', '10.0.0.1'],
        'rebind.example': ['127.0.0.1'],
      });
      expect(
        (await checkResolvedHost(new URL('https://evil.example'), fn, prod)).ok,
      ).toBe(false);
      expect(
        (await checkResolvedHost(new URL('https://rebind.example'), fn, prod))
          .ok,
      ).toBe(false);
    });

    it('autorise un hôte public et refuse un hôte non résolu', async () => {
      const fn = lookup({
        'ok.example': ['93.184.216.34', '2606:2800:220:1::1'],
      });
      expect(
        (await checkResolvedHost(new URL('https://ok.example'), fn, prod)).ok,
      ).toBe(true);
      expect(
        (await checkResolvedHost(new URL('https://missing.example'), fn, prod))
          .ok,
      ).toBe(false);
    });

    it('ne résout pas les IP littérales et respecte allowPrivate', async () => {
      const fn = lookup({});
      expect(
        (await checkResolvedHost(new URL('https://8.8.8.8'), fn, prod)).ok,
      ).toBe(true);
      expect(
        (await checkResolvedHost(new URL('https://[::1]'), fn, prod)).ok,
      ).toBe(false);
      expect(
        (
          await checkResolvedHost(
            new URL('http://anything.internal'),
            fn,
            devPrivate,
          )
        ).ok,
      ).toBe(true);
      expect(fn).not.toHaveBeenCalled();
    });
  });
});
