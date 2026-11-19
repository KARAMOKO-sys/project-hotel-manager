import { isIP } from 'net';

/**
 * Protection SSRF des URL de livraison sortante.
 *
 * - `checkUrlStatic` (pur, utilisé à l'enregistrement ET à la livraison) :
 *   schéma (https seul en production), pas d'identifiants dans l'URL,
 *   pas d'IP littérale privée/réservée, pas de nom d'hôte local connu.
 * - `checkResolvedHost` (à la livraison) : résout le nom d'hôte et refuse si
 *   UNE des adresses obtenues est privée/réservée.
 *
 * `allowPrivate` (env `INTEGRATION_ALLOW_PRIVATE_URLS=true`) désactive les
 * contrôles d'adresse pour le développement local, jamais le contrôle des
 * identifiants ni du schéma.
 */

export interface UrlGuardOptions {
  isProduction: boolean;
  allowPrivate: boolean;
}

export type UrlCheck = { ok: true; url: URL } | { ok: false; reason: string };

/** Noms d'hôte toujours refusés (hors `allowPrivate`). */
const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  'ip6-localhost',
  'ip6-loopback',
  'metadata',
  'metadata.google.internal',
  'metadata.goog',
]);

/** Plages IPv4 interdites : [adresse réseau, longueur du préfixe]. */
const BLOCKED_V4_CIDRS: Array<[string, number]> = [
  ['0.0.0.0', 8], // « ce réseau » (dont 0.0.0.0)
  ['10.0.0.0', 8], // privé
  ['100.64.0.0', 10], // CGNAT
  ['127.0.0.0', 8], // boucle locale
  ['169.254.0.0', 16], // lien local (dont métadonnées cloud 169.254.169.254)
  ['172.16.0.0', 12], // privé
  ['192.0.0.0', 24], // affectations IETF
  ['192.168.0.0', 16], // privé
  ['198.18.0.0', 15], // bancs de test
  ['224.0.0.0', 4], // multicast
  ['240.0.0.0', 4], // réservé + diffusion 255.255.255.255
];

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let value = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const n = Number(part);
    if (n > 255) return null;
    value = value * 256 + n;
  }
  return value;
}

function inV4Cidr(ip: number, network: string, prefix: number): boolean {
  const base = ipv4ToInt(network)!;
  const size = Math.pow(2, 32 - prefix);
  return ip >= base && ip < base + size;
}

/** Vrai si l'adresse IPv4 est privée, locale ou réservée. */
export function isBlockedIPv4(ip: string): boolean {
  const value = ipv4ToInt(ip);
  if (value === null) return true; // adresse illisible : on refuse
  return BLOCKED_V4_CIDRS.some(([net, prefix]) => inV4Cidr(value, net, prefix));
}

/** Développe une IPv6 en 8 groupes de 16 bits (null si invalide). */
export function expandIPv6(ip: string): number[] | null {
  let address = ip.toLowerCase();
  const zone = address.indexOf('%');
  if (zone >= 0) address = address.slice(0, zone);

  // Suffixe IPv4 embarqué (ex. ::ffff:127.0.0.1) → deux groupes hexadécimaux.
  const lastColon = address.lastIndexOf(':');
  const maybeV4 = address.slice(lastColon + 1);
  if (maybeV4.includes('.')) {
    const v4 = ipv4ToInt(maybeV4);
    if (v4 === null) return null;
    const high = Math.floor(v4 / 65536).toString(16);
    const low = (v4 % 65536).toString(16);
    address = `${address.slice(0, lastColon + 1)}${high}:${low}`;
  }

  const halves = address.split('::');
  if (halves.length > 2) return null;
  const parse = (part: string) =>
    part === ''
      ? []
      : part
          .split(':')
          .map((g) => (/^[0-9a-f]{1,4}$/.test(g) ? parseInt(g, 16) : NaN));
  const head = parse(halves[0]);
  const rest = halves.length === 2 ? parse(halves[1]) : [];
  if ([...head, ...rest].some((n) => Number.isNaN(n))) return null;
  if (halves.length === 1) return head.length === 8 ? head : null;
  const missing = 8 - head.length - rest.length;
  if (missing < 1) return null;
  return [...head, ...new Array<number>(missing).fill(0), ...rest];
}

/** Vrai si l'adresse IPv6 est locale, privée (ULA), lien local ou mappe une IPv4 interdite. */
export function isBlockedIPv6(ip: string): boolean {
  const g = expandIPv6(ip);
  if (!g) return true;
  const allZeroUntil = (n: number) => g.slice(0, n).every((x) => x === 0);
  // :: (non spécifiée) et ::1 (boucle locale)
  if (allZeroUntil(7) && (g[7] === 0 || g[7] === 1)) return true;
  // fc00::/7 (adresses uniques locales)
  if ((g[0] & 0xfe00) === 0xfc00) return true;
  // fe80::/10 (lien local) et fec0::/10 (site local, obsolète)
  if ((g[0] & 0xffc0) === 0xfe80 || (g[0] & 0xffc0) === 0xfec0) return true;
  // ff00::/8 (multicast)
  if ((g[0] & 0xff00) === 0xff00) return true;
  // ::ffff:a.b.c.d (IPv4 mappée) et ::a.b.c.d (IPv4 compatible, obsolète)
  if (allZeroUntil(5) && (g[5] === 0xffff || g[5] === 0)) {
    const v4 = `${g[6] >> 8}.${g[6] & 0xff}.${g[7] >> 8}.${g[7] & 0xff}`;
    return isBlockedIPv4(v4);
  }
  // 64:ff9b::/96 (NAT64) : on contrôle l'IPv4 embarquée
  if (g[0] === 0x64 && g[1] === 0xff9b && g.slice(2, 6).every((x) => x === 0)) {
    const v4 = `${g[6] >> 8}.${g[6] & 0xff}.${g[7] >> 8}.${g[7] & 0xff}`;
    return isBlockedIPv4(v4);
  }
  return false;
}

/** Vrai si l'adresse IP (v4 ou v6) est interdite. Les chaînes non IP sont refusées. */
export function isBlockedIp(ip: string): boolean {
  const family = isIP(ip);
  if (family === 4) return isBlockedIPv4(ip);
  if (family === 6) return isBlockedIPv6(ip);
  return true;
}

/** Retire les crochets d'une IPv6 littérale (`[::1]` → `::1`). */
export function normalizeHostname(hostname: string): string {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  return host.startsWith('[') && host.endsWith(']') ? host.slice(1, -1) : host;
}

/** Contrôles indépendants du DNS (schéma, identifiants, IP littérales). */
export function checkUrlStatic(
  rawUrl: string,
  options: UrlGuardOptions,
): UrlCheck {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { ok: false, reason: 'URL invalide' };
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return { ok: false, reason: 'Seuls les schémas http(s) sont acceptés' };
  }
  if (options.isProduction && url.protocol !== 'https:') {
    return { ok: false, reason: 'HTTPS est obligatoire en production' };
  }
  if (url.username || url.password) {
    return {
      ok: false,
      reason:
        "L'URL ne doit pas contenir d'identifiants (utilisateur:mot de passe)",
    };
  }
  const host = normalizeHostname(url.hostname);
  if (!host) return { ok: false, reason: 'Hôte manquant' };
  if (options.allowPrivate) return { ok: true, url };

  if (BLOCKED_HOSTNAMES.has(host) || host.endsWith('.localhost')) {
    return { ok: false, reason: `Hôte interdit : ${host}` };
  }
  if (isIP(host) && isBlockedIp(host)) {
    return {
      ok: false,
      reason: `Adresse IP privée ou réservée interdite : ${host}`,
    };
  }
  return { ok: true, url };
}

/** Fonction de résolution DNS (compatible `dns.promises.lookup(host, { all: true })`). */
export type LookupAll = (
  hostname: string,
  options: { all: true },
) => Promise<Array<{ address: string; family: number }>>;

/**
 * Résout le nom d'hôte et refuse si une adresse est privée/réservée.
 * Les IP littérales sont contrôlées sans résolution.
 */
export async function checkResolvedHost(
  url: URL,
  lookup: LookupAll,
  options: UrlGuardOptions,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (options.allowPrivate) return { ok: true };
  const host = normalizeHostname(url.hostname);
  if (isIP(host)) {
    return isBlockedIp(host)
      ? {
          ok: false,
          reason: `Adresse IP privée ou réservée interdite : ${host}`,
        }
      : { ok: true };
  }
  let addresses: Array<{ address: string }>;
  try {
    addresses = await lookup(host, { all: true });
  } catch (error) {
    return {
      ok: false,
      reason: `Résolution DNS impossible pour ${host} : ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
  if (!addresses.length) {
    return { ok: false, reason: `Aucune adresse pour ${host}` };
  }
  const blocked = addresses.find(({ address }) => isBlockedIp(address));
  return blocked
    ? {
        ok: false,
        reason: `${host} résout vers une adresse privée ou réservée (${blocked.address})`,
      }
    : { ok: true };
}
