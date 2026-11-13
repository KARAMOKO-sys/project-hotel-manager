import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Session,
  SessionDocument,
  SessionRevokeReason,
} from '../schemas/session.entity';
import { CreateSessionDto } from '../dto/create-session.dto';
import { UserType } from '../../base-entities/enums/user-type.enum';
import {
  generateRandomToken,
  hashToken,
  safeCompare,
} from '../../auth/utils/crypto.util';
import { parseDurationToSeconds } from '../../auth/utils/duration.util';

/** Durée de vie par défaut d'un refresh token : 30 jours. */
export const DEFAULT_REFRESH_TTL_SECONDS = 30 * 24 * 3600;

/** Résultat de la création (ou rotation) d'une session. */
export interface IssuedSession {
  session: SessionDocument;
  /** Refresh token en clair, à transmettre au client une seule fois. */
  refreshToken: string;
}

/** Métadonnées du client (appareil) à l'origine de la requête. */
export interface SessionClientInfo {
  user_agent?: string;
  ip?: string;
}

/**
 * Service de gestion des sessions (refresh tokens).
 *
 * Format du refresh token : `<sessionId>.<secret>`. L'identifiant permet de
 * retrouver la session en O(1) et le secret est comparé à l'empreinte stockée.
 * La rotation révoque l'ancienne session ; la réutilisation d'un token déjà
 * révoqué est considérée comme un vol et révoque toutes les sessions de
 * l'utilisateur.
 */
@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(
    @InjectModel(Session.name)
    private readonly sessionModel: Model<SessionDocument>,
    private readonly configService: ConfigService,
  ) {}

  /** Durée de vie configurée des refresh tokens (en secondes). */
  get refreshTtlSeconds(): number {
    return parseDurationToSeconds(
      this.configService.get<string>('JWT_REFRESH_EXPIRES_IN'),
      DEFAULT_REFRESH_TTL_SECONDS,
    );
  }

  /** Crée une session et renvoie le refresh token en clair. */
  async createSession(dto: CreateSessionDto): Promise<IssuedSession> {
    const ttl = dto.ttl_seconds ?? this.refreshTtlSeconds;
    const secret = generateRandomToken(48);
    const session = new this.sessionModel({
      user_id: new Types.ObjectId(dto.user_id),
      user_type: dto.user_type,
      refresh_token_hash: hashToken(secret),
      user_agent: dto.user_agent?.slice(0, 500),
      ip: dto.ip?.slice(0, 45),
      expires_at: new Date(Date.now() + ttl * 1000),
      last_used_at: new Date(),
      revoked_at: null,
    });
    await session.save();

    return {
      session,
      refreshToken: `${session._id.toString()}.${secret}`,
    };
  }

  /** Liste les sessions actives (non révoquées, non expirées) d'un utilisateur. */
  async findActiveByUser(
    userId: string,
    userType?: UserType,
  ): Promise<SessionDocument[]> {
    const filter: Record<string, unknown> = {
      user_id: new Types.ObjectId(userId),
      revoked_at: null,
      expires_at: { $gt: new Date() },
    };
    if (userType) {
      filter.user_type = userType;
    }
    return this.sessionModel
      .find(filter)
      .sort({ last_used_at: -1 })
      .lean<SessionDocument[]>()
      .exec();
  }

  /**
   * Valide un refresh token et renvoie la session correspondante.
   *
   * @throws UnauthorizedException si le token est mal formé, inconnu, expiré
   * ou révoqué. Dans ce dernier cas, toutes les sessions de l'utilisateur sont
   * révoquées (détection de réutilisation).
   */
  async validateRefreshToken(refreshToken: string): Promise<SessionDocument> {
    const { sessionId, secret } = this.parseRefreshToken(refreshToken);

    const session = await this.sessionModel
      .findById(sessionId)
      .select('+refresh_token_hash')
      .exec();

    if (
      !session ||
      !safeCompare(hashToken(secret), session.refresh_token_hash)
    ) {
      throw new UnauthorizedException('Refresh token invalide');
    }

    if (session.revoked_at) {
      this.logger.warn(
        `Réutilisation d'un refresh token révoqué (session ${sessionId}) : révocation de toutes les sessions de l'utilisateur ${session.user_id.toString()}`,
      );
      await this.revokeAllForUser(
        session.user_id.toString(),
        session.user_type,
        SessionRevokeReason.TOKEN_REUSE,
      );
      throw new UnauthorizedException('Refresh token révoqué');
    }

    if (session.expires_at.getTime() <= Date.now()) {
      throw new UnauthorizedException('Refresh token expiré');
    }

    return session;
  }

  /**
   * Rotation : valide le refresh token, révoque l'ancienne session et en crée
   * une nouvelle pour le même utilisateur.
   */
  async rotate(
    refreshToken: string,
    client: SessionClientInfo = {},
  ): Promise<IssuedSession> {
    const current = await this.validateRefreshToken(refreshToken);

    const issued = await this.createSession({
      user_id: current.user_id.toString(),
      user_type: current.user_type,
      user_agent: client.user_agent ?? current.user_agent,
      ip: client.ip ?? current.ip,
    });

    // Révocation atomique : si une autre requête a déjà fait la rotation,
    // la mise à jour ne trouve rien et la nouvelle session est annulée.
    const revoked = await this.sessionModel
      .findOneAndUpdate(
        { _id: current._id, revoked_at: null },
        {
          revoked_at: new Date(),
          revoked_reason: SessionRevokeReason.ROTATED,
          replaced_by: issued.session._id,
          last_used_at: new Date(),
        },
        { new: true },
      )
      .exec();

    if (!revoked) {
      await this.sessionModel.deleteOne({ _id: issued.session._id }).exec();
      throw new UnauthorizedException('Refresh token déjà utilisé');
    }

    return issued;
  }

  /**
   * Révoque une session.
   * Si `userId` est fourni, vérifie que la session lui appartient.
   */
  async revoke(
    sessionId: string,
    userId?: string,
    reason: SessionRevokeReason = SessionRevokeReason.LOGOUT,
  ): Promise<SessionDocument> {
    if (!Types.ObjectId.isValid(sessionId)) {
      throw new NotFoundException('Session introuvable');
    }
    const session = await this.sessionModel.findById(sessionId).exec();
    if (!session) {
      throw new NotFoundException('Session introuvable');
    }
    if (userId && session.user_id.toString() !== userId) {
      throw new ForbiddenException(
        "Cette session n'appartient pas à l'utilisateur",
      );
    }
    if (!session.revoked_at) {
      session.revoked_at = new Date();
      session.revoked_reason = reason;
      await session.save();
    }
    return session;
  }

  /**
   * Révoque toutes les sessions actives d'un utilisateur.
   * `exceptSessionId` permet de conserver la session courante.
   * Renvoie le nombre de sessions révoquées.
   */
  async revokeAllForUser(
    userId: string,
    userType?: UserType,
    reason: SessionRevokeReason = SessionRevokeReason.LOGOUT_ALL,
    exceptSessionId?: string,
  ): Promise<number> {
    const filter: Record<string, unknown> = {
      user_id: new Types.ObjectId(userId),
      revoked_at: null,
    };
    if (userType) {
      filter.user_type = userType;
    }
    if (exceptSessionId && Types.ObjectId.isValid(exceptSessionId)) {
      filter._id = { $ne: new Types.ObjectId(exceptSessionId) };
    }
    const result = await this.sessionModel
      .updateMany(filter, {
        revoked_at: new Date(),
        revoked_reason: reason,
      })
      .exec();
    return result.modifiedCount ?? 0;
  }

  /** Met à jour la date de dernière utilisation d'une session. */
  async touch(sessionId: string): Promise<void> {
    await this.sessionModel
      .updateOne({ _id: sessionId }, { last_used_at: new Date() })
      .exec();
  }

  /**
   * Supprime les sessions expirées et les sessions révoquées depuis plus de
   * `revokedRetentionDays` jours. Complète l'index TTL de MongoDB.
   */
  async purgeExpired(revokedRetentionDays = 7): Promise<number> {
    const now = Date.now();
    const result = await this.sessionModel
      .deleteMany({
        $or: [
          { expires_at: { $lte: new Date(now) } },
          {
            revoked_at: {
              $ne: null,
              $lte: new Date(now - revokedRetentionDays * 86400 * 1000),
            },
          },
        ],
      })
      .exec();
    return result.deletedCount ?? 0;
  }

  /** Découpe un refresh token `<sessionId>.<secret>`. */
  private parseRefreshToken(refreshToken: string): {
    sessionId: string;
    secret: string;
  } {
    if (typeof refreshToken !== 'string') {
      throw new UnauthorizedException('Refresh token invalide');
    }
    const index = refreshToken.indexOf('.');
    const sessionId = index > 0 ? refreshToken.slice(0, index) : '';
    const secret = index > 0 ? refreshToken.slice(index + 1) : '';
    if (!secret || !Types.ObjectId.isValid(sessionId)) {
      throw new UnauthorizedException('Refresh token invalide');
    }
    return { sessionId, secret };
  }
}
