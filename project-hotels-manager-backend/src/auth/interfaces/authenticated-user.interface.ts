import { UserType } from '../../base-entities/enums/user-type.enum';
import { JwtTokenType } from '../auth.constants';

/**
 * Utilisateur authentifié, attaché à `request.user` par `JwtAuthGuard`.
 */
export interface AuthenticatedUser {
  /** Identifiant MongoDB de l'utilisateur (dans la collection de son type). */
  sub: string;
  /** Type d'utilisateur (= collection d'origine). */
  user_type: UserType;
  email: string;
  /** Codes des rôles (type d'utilisateur + rôles assignés via UserRole). */
  roles: string[];
  /** Identifiant de la session (refresh token) associée. */
  sid?: string;
}

/** Contenu d'un JWT émis par l'API. */
export interface JwtPayload extends AuthenticatedUser {
  type: JwtTokenType;
  iat?: number;
  exp?: number;
}
