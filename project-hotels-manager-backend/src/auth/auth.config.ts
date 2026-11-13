import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { parseDurationToSeconds } from './utils/duration.util';

/** Configuration résolue du module d'authentification. */
export interface AuthConfig {
  jwtSecret: string;
  jwtIssuer?: string;
  accessTtlSeconds: number;
  refreshTtlSeconds: number;
  twoFactorTtlSeconds: number;
  magicLinkTtlSeconds: number;
  passwordResetTtlSeconds: number;
  emailVerificationTtlSeconds: number;
  maxFailedAttempts: number;
  lockDurationSeconds: number;
  bcryptRounds: number;
  twoFactorIssuer: string;
  frontendUrl: string;
  isProduction: boolean;
}

/** Secret utilisé uniquement en développement si `JWT_SECRET` est absent. */
const DEV_FALLBACK_SECRET = 'dev-only-insecure-jwt-secret-change-me';

const logger = new Logger('AuthConfig');
let warnedAboutSecret = false;

function toInt(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

/**
 * Construit la configuration d'authentification à partir des variables
 * d'environnement, avec des valeurs par défaut raisonnables.
 *
 * En production, l'absence de `JWT_SECRET` est une erreur bloquante.
 */
export function buildAuthConfig(config: ConfigService): AuthConfig {
  const isProduction = config.get<string>('NODE_ENV') === 'production';
  let jwtSecret = config.get<string>('JWT_SECRET');

  if (!jwtSecret) {
    if (isProduction) {
      throw new Error('JWT_SECRET doit être défini en production');
    }
    if (!warnedAboutSecret) {
      logger.warn(
        'JWT_SECRET non défini : utilisation d’un secret de développement NON SÉCURISÉ',
      );
      warnedAboutSecret = true;
    }
    jwtSecret = DEV_FALLBACK_SECRET;
  }

  return {
    jwtSecret,
    jwtIssuer: config.get<string>('JWT_ISSUER') || undefined,
    accessTtlSeconds: parseDurationToSeconds(
      config.get<string>('JWT_EXPIRES_IN'),
      15 * 60,
    ),
    refreshTtlSeconds: parseDurationToSeconds(
      config.get<string>('JWT_REFRESH_EXPIRES_IN'),
      30 * 86400,
    ),
    twoFactorTtlSeconds: parseDurationToSeconds(
      config.get<string>('JWT_2FA_EXPIRES_IN'),
      5 * 60,
    ),
    magicLinkTtlSeconds: parseDurationToSeconds(
      config.get<string>('AUTH_MAGIC_LINK_EXPIRES_IN'),
      15 * 60,
    ),
    passwordResetTtlSeconds: parseDurationToSeconds(
      config.get<string>('AUTH_PASSWORD_RESET_EXPIRES_IN'),
      60 * 60,
    ),
    emailVerificationTtlSeconds: parseDurationToSeconds(
      config.get<string>('AUTH_EMAIL_VERIFICATION_EXPIRES_IN'),
      24 * 3600,
    ),
    maxFailedAttempts: toInt(config.get('AUTH_MAX_FAILED_ATTEMPTS'), 5),
    lockDurationSeconds: parseDurationToSeconds(
      config.get<string>('AUTH_LOCK_DURATION'),
      15 * 60,
    ),
    bcryptRounds: toInt(config.get('AUTH_BCRYPT_ROUNDS'), 10),
    twoFactorIssuer: config.get<string>('TWO_FACTOR_ISSUER') || 'PleasantStay',
    frontendUrl: (
      config.get<string>('FRONTEND_URL') || 'http://localhost:4200'
    ).replace(/\/+$/, ''),
    isProduction,
  };
}
