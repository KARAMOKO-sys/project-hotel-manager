import { createHash, randomBytes, timingSafeEqual } from 'crypto';

/**
 * Utilitaires cryptographiques partagés par l'authentification et les sessions.
 *
 * Les jetons opaques (refresh token, lien magique, réinitialisation…) sont
 * générés avec une forte entropie (256 bits) : un simple SHA-256 suffit donc
 * pour les stocker, contrairement aux mots de passe qui exigent bcrypt.
 */

/** Génère un jeton aléatoire encodé en base64url (URL-safe). */
export function generateRandomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

/** Calcule l'empreinte SHA-256 (hexadécimale) d'un jeton. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Compare deux chaînes en temps constant pour éviter les attaques temporelles. */
export function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}
