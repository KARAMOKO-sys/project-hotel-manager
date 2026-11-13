import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { IS_PUBLIC_KEY, JwtTokenType } from '../auth.constants';
import { buildAuthConfig } from '../auth.config';
import {
  AuthenticatedUser,
  JwtPayload,
} from '../interfaces/authenticated-user.interface';

/**
 * Garde d'authentification par jeton Bearer (JWT d'accès).
 *
 * - Laisse passer les routes marquées `@Public()`.
 * - Rejette les jetons absents, invalides, expirés ou qui ne sont pas des
 *   jetons d'accès (ex. jeton temporaire 2FA).
 * - Attache l'utilisateur authentifié à `request.user`.
 *
 * Nécessite que `JwtService` soit disponible (AuthModule l'enregistre en
 * global).
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();
    const token = JwtAuthGuard.extractBearerToken(request);
    if (!token) {
      throw new UnauthorizedException("Jeton d'authentification manquant");
    }

    let payload: JwtPayload;
    try {
      const { jwtSecret, jwtIssuer } = buildAuthConfig(this.configService);
      payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: jwtSecret,
        ...(jwtIssuer ? { issuer: jwtIssuer } : {}),
      });
    } catch {
      throw new UnauthorizedException("Jeton d'authentification invalide");
    }

    if (payload?.type !== JwtTokenType.ACCESS || !payload.sub) {
      throw new UnauthorizedException("Jeton d'authentification invalide");
    }

    request.user = {
      sub: payload.sub,
      user_type: payload.user_type,
      email: payload.email,
      roles: Array.isArray(payload.roles) ? payload.roles : [],
      sid: payload.sid,
    };
    return true;
  }

  /** Extrait le jeton de l'en-tête `Authorization: Bearer <token>`. */
  static extractBearerToken(request: Request): string | undefined {
    const header = request.headers?.authorization;
    if (!header || typeof header !== 'string') {
      return undefined;
    }
    const [scheme, token] = header.split(' ');
    return scheme?.toLowerCase() === 'bearer' && token ? token : undefined;
  }
}
