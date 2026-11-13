import { Injectable } from '@nestjs/common';
import { authenticator } from 'otplib';

/**
 * Encapsule la bibliothèque `otplib` pour la double authentification TOTP
 * (Google Authenticator, Authy…). Codes à 6 chiffres, période de 30 s,
 * tolérance d'une période avant/après pour absorber le décalage d'horloge.
 */
@Injectable()
export class TotpService {
  private readonly authenticator = authenticator.clone({ window: 1 });

  /** Génère un nouveau secret encodé en base32. */
  generateSecret(): string {
    return this.authenticator.generateSecret(20);
  }

  /** Construit l'URI `otpauth://` à encoder en QR code côté client. */
  buildOtpAuthUrl(accountName: string, issuer: string, secret: string): string {
    return this.authenticator.keyuri(accountName, issuer, secret);
  }

  /** Génère le code courant (utile pour les tests). */
  generateCode(secret: string): string {
    return this.authenticator.generate(secret);
  }

  /** Vérifie un code TOTP. Ne lève jamais d'erreur. */
  verify(code: string, secret: string): Promise<boolean> {
    if (!code || !secret || !/^\d{6}$/.test(code)) {
      return Promise.resolve(false);
    }
    try {
      return Promise.resolve(this.authenticator.check(code, secret));
    } catch {
      return Promise.resolve(false);
    }
  }
}
