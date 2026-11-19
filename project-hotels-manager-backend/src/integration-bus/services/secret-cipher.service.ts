import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const FORMAT_VERSION = 'v1';
/** Données authentifiées associées : lie le chiffré à cet usage. */
const AAD = Buffer.from('pleasantstay-integration-secret', 'utf8');
/** Même secret de repli que `auth.config.ts` lorsque JWT_SECRET est absent. */
const DEV_FALLBACK_JWT_SECRET = 'dev-only-insecure-jwt-secret-change-me';

type EnvGetter = (key: string) => string | undefined;

/**
 * Lit la clé AES-256 (32 octets, base64 ou hexadécimal) depuis
 * `INTEGRATION_ENCRYPTION_KEY`.
 *
 * - Production : clé obligatoire et valide, sinon erreur au démarrage.
 * - Hors production : repli sur une clé dérivée de `JWT_SECRET` (SHA-256),
 *   avec un avertissement.
 */
export function resolveEncryptionKey(
  get: EnvGetter,
  logger?: Pick<Logger, 'warn'>,
): Buffer {
  const isProduction = get('NODE_ENV') === 'production';
  const raw = get('INTEGRATION_ENCRYPTION_KEY')?.trim();
  if (raw) {
    const key = parseKey(raw);
    if (key) return key;
    if (isProduction) {
      throw new Error(
        'INTEGRATION_ENCRYPTION_KEY invalide : 32 octets attendus (base64 ou hexadécimal)',
      );
    }
    logger?.warn(
      'INTEGRATION_ENCRYPTION_KEY invalide (32 octets attendus) : repli sur une clé dérivée de JWT_SECRET',
    );
  } else if (isProduction) {
    throw new Error(
      'INTEGRATION_ENCRYPTION_KEY doit être défini en production (32 octets base64 ou hexadécimal)',
    );
  } else {
    logger?.warn(
      'INTEGRATION_ENCRYPTION_KEY non défini : clé de chiffrement dérivée de JWT_SECRET (développement uniquement)',
    );
  }
  const jwtSecret = get('JWT_SECRET') || DEV_FALLBACK_JWT_SECRET;
  return createHash('sha256')
    .update(`pleasantstay-integration-bus:${jwtSecret}`)
    .digest();
}

function parseKey(raw: string): Buffer | null {
  if (/^[0-9a-f]{64}$/i.test(raw)) return Buffer.from(raw, 'hex');
  if (/^[A-Za-z0-9+/_-]+={0,2}$/.test(raw)) {
    const decoded = Buffer.from(
      raw,
      raw.includes('-') || raw.includes('_') ? 'base64url' : 'base64',
    );
    if (decoded.length === 32) return decoded;
  }
  return null;
}

/** Chiffre une chaîne : `v1:<iv b64>:<tag b64>:<chiffré b64>`. */
export function encryptWithKey(key: Buffer, plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  cipher.setAAD(AAD);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    FORMAT_VERSION,
    iv.toString('base64'),
    tag.toString('base64'),
    encrypted.toString('base64'),
  ].join(':');
}

/** Déchiffre et authentifie ; lève une erreur si la donnée a été altérée. */
export function decryptWithKey(key: Buffer, payload: string): string {
  const parts = payload.split(':');
  if (parts.length !== 4 || parts[0] !== FORMAT_VERSION) {
    throw new Error('Format de secret chiffré inconnu');
  }
  const [, ivB64, tagB64, dataB64] = parts;
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  if (iv.length !== IV_LENGTH || tag.length !== 16) {
    throw new Error('Secret chiffré corrompu');
  }
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAAD(AAD);
  decipher.setAuthTag(tag);
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

/** Génère un secret de signature aléatoire (256 bits). */
export function generateSigningSecret(): string {
  return `whsec_${randomBytes(32).toString('base64url')}`;
}

/** Indice masqué d'un secret (4 derniers caractères). */
export function secretHint(secret: string): string {
  return `••••${secret.slice(-4)}`;
}

/**
 * Chiffrement au repos (AES-256-GCM) des secrets de l'ESB : secrets de
 * signature des points de terminaison et des sources entrantes.
 */
@Injectable()
export class SecretCipherService {
  private readonly logger = new Logger(SecretCipherService.name);
  private readonly key: Buffer;

  constructor(config: ConfigService) {
    this.key = resolveEncryptionKey(
      (name) => config.get<string>(name) ?? process.env[name],
      this.logger,
    );
  }

  encrypt(plaintext: string): string {
    return encryptWithKey(this.key, plaintext);
  }

  decrypt(payload: string): string {
    return decryptWithKey(this.key, payload);
  }
}
