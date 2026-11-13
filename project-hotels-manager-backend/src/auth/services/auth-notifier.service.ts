import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserType } from '../../base-entities/enums/user-type.enum';

/** Destinataire d'une notification d'authentification. */
export interface AuthNotificationRecipient {
  email: string;
  first_name?: string;
  user_type: UserType;
}

/**
 * Point d'extension pour l'envoi des emails d'authentification.
 *
 * Pour brancher un vrai service d'envoi (ex. `@nestjs-modules/mailer`),
 * implémenter cette interface et remplacer le fournisseur `AUTH_NOTIFIER`
 * dans `AuthModule` :
 *
 * ```ts
 * { provide: AUTH_NOTIFIER, useClass: MailerAuthNotifier }
 * ```
 */
export interface AuthNotifier {
  sendEmailVerification(
    to: AuthNotificationRecipient,
    token: string,
    link: string,
  ): Promise<void>;
  sendPasswordReset(
    to: AuthNotificationRecipient,
    token: string,
    link: string,
  ): Promise<void>;
  sendMagicLink(
    to: AuthNotificationRecipient,
    token: string,
    link: string,
  ): Promise<void>;
}

/**
 * Implémentation par défaut : n'envoie aucun email.
 * Hors production, le lien est écrit dans les logs pour faciliter les tests.
 */
@Injectable()
export class LoggingAuthNotifier implements AuthNotifier {
  private readonly logger = new Logger('AuthNotifier');

  constructor(private readonly configService: ConfigService) {}

  sendEmailVerification(
    to: AuthNotificationRecipient,
    _token: string,
    link: string,
  ) {
    return this.log('vérification email', to, link);
  }

  sendPasswordReset(
    to: AuthNotificationRecipient,
    _token: string,
    link: string,
  ) {
    return this.log('réinitialisation du mot de passe', to, link);
  }

  sendMagicLink(to: AuthNotificationRecipient, _token: string, link: string) {
    return this.log('lien magique', to, link);
  }

  private log(
    kind: string,
    to: AuthNotificationRecipient,
    link: string,
  ): Promise<void> {
    if (this.configService.get<string>('NODE_ENV') === 'production') {
      this.logger.warn(
        `Aucun service d'email configuré : ${kind} non envoyé à ${to.email}`,
      );
    } else {
      this.logger.log(
        `[DEV] ${kind} pour ${to.email} (${to.user_type}) : ${link}`,
      );
    }
    return Promise.resolve();
  }
}
