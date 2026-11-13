/** Clé de métadonnée posée par le décorateur `@Public()`. */
export const IS_PUBLIC_KEY = 'auth:isPublic';

/** Clé de métadonnée posée par le décorateur `@Roles()`. */
export const ROLES_KEY = 'auth:roles';

/** Clé de métadonnée posée par le décorateur `@Permissions()`. */
export const PERMISSIONS_KEY = 'auth:permissions';

/** Rôle disposant de tous les droits (contourne `RolesGuard`). */
export const SUPER_ADMIN_ROLE = 'super_admin';

/** Code du rôle attribué par défaut lors de l'inscription. */
export const DEFAULT_GUEST_ROLE_CODE = 'guest';

/** Jeton d'injection du service d'envoi des notifications d'authentification. */
export const AUTH_NOTIFIER = Symbol('AUTH_NOTIFIER');

/** Types de JWT émis par l'API. */
export enum JwtTokenType {
  /** Jeton d'accès classique. */
  ACCESS = 'access',
  /** Jeton temporaire entre le mot de passe et la vérification 2FA. */
  TWO_FACTOR = '2fa',
}
