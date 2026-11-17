import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { UserType } from '../../base-entities/enums/user-type.enum';
import { SessionService } from '../../session/services/session.service';
import { SessionRevokeReason } from '../../session/schemas/session.entity';
import { UserRoleService } from '../../user-role/services/user-role.service';
import {
  AuthToken,
  AuthTokenDocument,
  AuthTokenType,
} from '../schemas/auth-token.entity';
import {
  AuthUserDocument,
  UserAccount,
  UserAccountsService,
  UserProfile,
} from './user-accounts.service';
import { TotpService } from './totp.service';
import type {
  AuthNotificationRecipient,
  AuthNotifier,
} from './auth-notifier.service';
import {
  AUTH_NOTIFIER,
  DEFAULT_GUEST_ROLE_CODE,
  JwtTokenType,
} from '../auth.constants';
import { AuthConfig, buildAuthConfig } from '../auth.config';
import {
  AuthenticatedUser,
  JwtPayload,
} from '../interfaces/authenticated-user.interface';
import { generateRandomToken, hashToken } from '../utils/crypto.util';
import type { ClientInfo } from '../decorators/client-info.decorator';
import {
  ChangePasswordDto,
  EmailRequestDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  VerifyTwoFactorLoginDto,
} from '../dto/auth.dto';

/** Jetons renvoyés après une authentification complète. */
export interface AuthTokensResponse {
  access_token: string;
  refresh_token: string;
  token_type: 'Bearer';
  /** Durée de vie du jeton d'accès en secondes. */
  expires_in: number;
  user: UserProfile;
}

/** Réponse intermédiaire lorsque la 2FA est requise. */
export interface TwoFactorChallengeResponse {
  requires_two_factor: true;
  two_factor_token: string;
  expires_in: number;
}

export type LoginResponse = AuthTokensResponse | TwoFactorChallengeResponse;

/** Réponse générique (avec jeton exposé hors production uniquement). */
export interface MessageResponse {
  message: string;
  /** Présent uniquement hors production, pour faciliter les tests. */
  dev_token?: string;
}

/** Statuts de compte (selon les collections) qui interdisent la connexion. */
const BLOCKING_STATUSES = new Set(['blocked', 'suspended', 'inactive']);

/**
 * Service d'authentification.
 *
 * - Inscription (crée un compte client `Guest`) et connexion multi-collections.
 * - JWT d'accès court + refresh token opaque stocké (haché) dans `Session`,
 *   avec rotation et détection de réutilisation.
 * - Verrouillage après plusieurs échecs, double authentification TOTP,
 *   réinitialisation de mot de passe, lien magique, vérification d'email.
 *
 * Aucun email n'est envoyé directement : voir `AUTH_NOTIFIER`.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly config: AuthConfig;
  private dummyHash?: string;

  constructor(
    private readonly accounts: UserAccountsService,
    private readonly sessionService: SessionService,
    private readonly userRoleService: UserRoleService,
    private readonly jwtService: JwtService,
    private readonly totpService: TotpService,
    configService: ConfigService,
    @InjectModel(AuthToken.name)
    private readonly authTokenModel: Model<AuthToken>,
    @Inject(AUTH_NOTIFIER) private readonly notifier: AuthNotifier,
  ) {
    this.config = buildAuthConfig(configService);
  }

  // ===========================================================================
  // INSCRIPTION / CONNEXION
  // ===========================================================================

  /**
   * Inscrit un nouveau client (compte `Guest`), lui assigne le rôle par
   * défaut, émet un jeton de vérification d'email et ouvre une session.
   */
  async register(
    dto: RegisterDto,
    client: ClientInfo = {},
  ): Promise<AuthTokensResponse & { dev_token?: string }> {
    if (await this.accounts.emailExists(dto.email)) {
      throw new ConflictException('Un compte existe déjà avec cet email');
    }

    const guestModel = this.accounts.getModel(UserType.GUEST)!;
    const guest = new guestModel({
      email: dto.email,
      first_name: dto.first_name,
      last_name: dto.last_name,
      phone: dto.phone,
      password_hash: await this.hashPassword(dto.password),
      password_changed_at: new Date(),
      metadata: {
        source: 'register',
        ...(dto.pseudo ? { pseudo: dto.pseudo } : {}),
      },
    }) as AuthUserDocument;

    try {
      await guest.save();
    } catch (error) {
      if ((error as { code?: number })?.code === 11000) {
        throw new ConflictException('Un compte existe déjà avec cet email');
      }
      throw error;
    }

    const account: UserAccount = { type: UserType.GUEST, user: guest };
    const userId = String(guest._id);

    try {
      await this.userRoleService.assignRoleByCode(
        userId,
        UserType.GUEST,
        DEFAULT_GUEST_ROLE_CODE,
      );
    } catch (error) {
      this.logger.warn(
        `Assignation du rôle par défaut impossible pour ${userId} : ${(error as Error).message}`,
      );
    }

    const verificationToken = await this.createAuthToken(
      AuthTokenType.EMAIL_VERIFICATION,
      account,
      this.config.emailVerificationTtlSeconds,
      client,
    );
    await this.notify(
      'sendEmailVerification',
      account,
      verificationToken,
      'verify-email',
    );

    const tokens = await this.issueTokens(account, client);
    return this.withDevToken(tokens, verificationToken);
  }

  /**
   * Connexion par email / mot de passe.
   *
   * Si l'email existe dans plusieurs collections, le mot de passe est testé
   * sur chaque compte (par priorité). Après `maxFailedAttempts` échecs, le
   * compte est verrouillé pendant `lockDurationSeconds`. Si la 2FA est active,
   * un jeton temporaire est renvoyé à la place des jetons d'accès.
   */
  async login(dto: LoginDto, client: ClientInfo = {}): Promise<LoginResponse> {
    const candidates = await this.accounts.findByEmail(dto.email, {
      withSecrets: true,
      userType: dto.user_type,
    });

    if (candidates.length === 0) {
      // Comparaison factice pour limiter les attaques par mesure du temps.
      await bcrypt.compare(dto.password, await this.getDummyHash());
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    const unlocked = candidates.filter((c) => !this.isLocked(c.user));
    for (const candidate of unlocked) {
      if (await this.checkPassword(dto.password, candidate.user)) {
        return this.completeLogin(candidate, client);
      }
    }

    for (const candidate of unlocked) {
      await this.registerFailedAttempt(candidate);
    }

    // Tous les comptes sont verrouillés (déjà, ou suite à cet échec).
    if (candidates.every((c) => this.isLocked(c.user))) {
      throw this.lockedException(candidates);
    }
    throw new UnauthorizedException('Email ou mot de passe incorrect');
  }

  /** Finalise une connexion protégée par 2FA avec le code TOTP. */
  async verifyTwoFactorLogin(
    dto: VerifyTwoFactorLoginDto,
    client: ClientInfo = {},
  ): Promise<AuthTokensResponse> {
    const payload = await this.verifyJwt(dto.two_factor_token);
    if (payload.type !== JwtTokenType.TWO_FACTOR) {
      throw new UnauthorizedException('Jeton 2FA invalide');
    }

    const user = await this.accounts.findById(
      payload.user_type,
      payload.sub,
      true,
    );
    if (!user || !user.two_factor_enabled || !user.two_factor_secret) {
      throw new UnauthorizedException('Jeton 2FA invalide');
    }
    const account: UserAccount = { type: payload.user_type, user };
    this.assertAccountUsable(user);
    if (this.isLocked(user)) {
      throw this.lockedException([account]);
    }

    const valid = await this.totpService.verify(
      dto.code,
      user.two_factor_secret,
    );
    if (!valid) {
      const locked = await this.registerFailedAttempt(account);
      if (locked) {
        throw this.lockedException([account]);
      }
      throw new UnauthorizedException('Code de vérification invalide');
    }

    await this.recordSuccessfulLogin(account, client);
    return this.issueTokens(account, client);
  }

  /** Rafraîchit les jetons (rotation du refresh token). */
  async refresh(
    refreshToken: string,
    client: ClientInfo = {},
  ): Promise<AuthTokensResponse> {
    const { session, refreshToken: newRefreshToken } =
      await this.sessionService.rotate(refreshToken, client);

    const userId = session.user_id.toString();
    const user = await this.accounts.findById(session.user_type, userId);
    if (
      !user ||
      user.is_active === false ||
      this.hasBlockingStatus(user) ||
      this.isLocked(user)
    ) {
      await this.sessionService.revoke(
        session._id.toString(),
        undefined,
        SessionRevokeReason.ADMIN,
      );
      throw new UnauthorizedException('Compte indisponible');
    }

    const account: UserAccount = { type: session.user_type, user };
    const accessToken = await this.signAccessToken(
      account,
      session._id.toString(),
    );
    return {
      access_token: accessToken,
      refresh_token: newRefreshToken,
      token_type: 'Bearer',
      expires_in: this.config.accessTtlSeconds,
      user: UserAccountsService.toProfile(user, account.type),
    };
  }

  /** Déconnecte la session courante. */
  async logout(user: AuthenticatedUser): Promise<{ success: true }> {
    if (user.sid) {
      try {
        await this.sessionService.revoke(
          user.sid,
          user.sub,
          SessionRevokeReason.LOGOUT,
        );
      } catch (error) {
        this.logger.debug(`Déconnexion : ${(error as Error).message}`);
      }
    }
    return { success: true };
  }

  /** Déconnecte toutes les sessions de l'utilisateur. */
  async logoutAll(user: AuthenticatedUser): Promise<{ revoked: number }> {
    const revoked = await this.sessionService.revokeAllForUser(
      user.sub,
      user.user_type,
      SessionRevokeReason.LOGOUT_ALL,
    );
    return { revoked };
  }

  /** Profil, rôles et permissions de l'utilisateur connecté. */
  async me(
    current: AuthenticatedUser,
  ): Promise<UserProfile & { roles: string[]; permissions: string[] }> {
    const user = await this.accounts.findById(current.user_type, current.sub);
    if (!user) {
      throw new UnauthorizedException('Utilisateur introuvable');
    }
    const [roleCodes, permissions] = await Promise.all([
      this.userRoleService.getUserRoleCodes(current.sub, {
        userType: current.user_type,
      }),
      this.userRoleService.getUserPermissions(current.sub, {
        userType: current.user_type,
      }),
    ]);
    return {
      ...UserAccountsService.toProfile(user, current.user_type),
      roles: [...new Set([current.user_type, ...roleCodes])],
      permissions,
    };
  }

  // ===========================================================================
  // MOTS DE PASSE
  // ===========================================================================

  /**
   * Demande de réinitialisation. La réponse est identique que le compte
   * existe ou non (pas d'énumération des emails).
   */
  async requestPasswordReset(
    dto: EmailRequestDto,
    client: ClientInfo = {},
  ): Promise<MessageResponse> {
    const response: MessageResponse = {
      message:
        'Si un compte correspond à cet email, un lien de réinitialisation a été envoyé',
    };
    const [account] = await this.accounts.findByEmail(dto.email, {
      userType: dto.user_type,
    });
    if (!account || account.user.is_active === false) {
      return response;
    }

    const token = await this.createAuthToken(
      AuthTokenType.PASSWORD_RESET,
      account,
      this.config.passwordResetTtlSeconds,
      client,
    );
    await this.notify('sendPasswordReset', account, token, 'reset-password');
    return this.withDevToken(response, token);
  }

  /** Réinitialise le mot de passe et révoque toutes les sessions. */
  async resetPassword(dto: ResetPasswordDto): Promise<{ success: true }> {
    const authToken = await this.consumeAuthToken(
      dto.token,
      AuthTokenType.PASSWORD_RESET,
    );
    const userId = authToken.user_id.toString();
    const user = await this.accounts.findById(authToken.user_type, userId);
    if (!user) {
      throw new BadRequestException('Jeton invalide ou expiré');
    }

    await this.accounts.updateById(authToken.user_type, userId, {
      password_hash: await this.hashPassword(dto.new_password),
      password_changed_at: new Date(),
      failed_login_attempts: 0,
      $unset: { locked_until: 1 },
    });
    await this.authTokenModel
      .deleteMany({
        user_id: authToken.user_id,
        user_type: authToken.user_type,
        type: AuthTokenType.PASSWORD_RESET,
        used_at: null,
      })
      .exec();
    await this.sessionService.revokeAllForUser(
      userId,
      authToken.user_type,
      SessionRevokeReason.PASSWORD_CHANGED,
    );
    return { success: true };
  }

  /**
   * Changement de mot de passe par l'utilisateur connecté. Les autres
   * sessions sont révoquées, la session courante est conservée.
   */
  async changePassword(
    current: AuthenticatedUser,
    dto: ChangePasswordDto,
  ): Promise<{ success: true }> {
    const user = await this.accounts.findById(
      current.user_type,
      current.sub,
      true,
    );
    if (!user) {
      throw new UnauthorizedException('Utilisateur introuvable');
    }
    if (!(await this.checkPassword(dto.current_password, user))) {
      throw new BadRequestException('Mot de passe actuel incorrect');
    }
    if (await this.checkPassword(dto.new_password, user)) {
      throw new BadRequestException(
        "Le nouveau mot de passe doit être différent de l'ancien",
      );
    }

    await this.accounts.updateById(current.user_type, current.sub, {
      password_hash: await this.hashPassword(dto.new_password),
      password_changed_at: new Date(),
    });
    await this.sessionService.revokeAllForUser(
      current.sub,
      current.user_type,
      SessionRevokeReason.PASSWORD_CHANGED,
      current.sid,
    );
    return { success: true };
  }

  // ===========================================================================
  // LIEN MAGIQUE / VÉRIFICATION D'EMAIL
  // ===========================================================================

  /** Génère un lien de connexion sans mot de passe (15 min par défaut). */
  async generateMagicLink(
    dto: EmailRequestDto,
    client: ClientInfo = {},
  ): Promise<MessageResponse> {
    const response: MessageResponse = {
      message:
        'Si un compte correspond à cet email, un lien de connexion a été envoyé',
    };
    const [account] = await this.accounts.findByEmail(dto.email, {
      userType: dto.user_type,
    });
    if (
      !account ||
      account.user.is_active === false ||
      this.hasBlockingStatus(account.user)
    ) {
      return response;
    }

    const token = await this.createAuthToken(
      AuthTokenType.MAGIC_LINK,
      account,
      this.config.magicLinkTtlSeconds,
      client,
    );
    await this.notify('sendMagicLink', account, token, 'magic-link');
    return this.withDevToken(response, token);
  }

  /**
   * Connexion via lien magique (usage unique). L'email est considéré comme
   * vérifié. La 2FA reste exigée si elle est activée.
   */
  async loginWithMagicLink(
    token: string,
    client: ClientInfo = {},
  ): Promise<LoginResponse> {
    const authToken = await this.consumeAuthToken(
      token,
      AuthTokenType.MAGIC_LINK,
    );
    const userId = authToken.user_id.toString();
    const user = await this.accounts.findById(
      authToken.user_type,
      userId,
      true,
    );
    if (!user) {
      throw new BadRequestException('Jeton invalide ou expiré');
    }
    const account: UserAccount = { type: authToken.user_type, user };
    if (this.isLocked(user)) {
      throw this.lockedException([account]);
    }
    if (!user.is_email_verified) {
      await this.accounts.updateById(account.type, userId, {
        is_email_verified: true,
      });
      user.is_email_verified = true;
    }
    return this.completeLogin(account, client);
  }

  /** Valide l'email d'un utilisateur via le jeton reçu. */
  async verifyEmail(token: string): Promise<{ success: true }> {
    const authToken = await this.consumeAuthToken(
      token,
      AuthTokenType.EMAIL_VERIFICATION,
    );
    await this.accounts.updateById(
      authToken.user_type,
      authToken.user_id.toString(),
      {
        is_email_verified: true,
      },
    );
    return { success: true };
  }

  // ===========================================================================
  // DOUBLE AUTHENTIFICATION (TOTP)
  // ===========================================================================

  /**
   * Démarre l'activation de la 2FA : génère un secret (non encore actif) et
   * l'URI `otpauth://` à afficher sous forme de QR code.
   */
  async enableTwoFactor(
    current: AuthenticatedUser,
  ): Promise<{ secret: string; otpauth_url: string }> {
    const user = await this.accounts.findById(
      current.user_type,
      current.sub,
      true,
    );
    if (!user) {
      throw new UnauthorizedException('Utilisateur introuvable');
    }
    if (user.two_factor_enabled) {
      throw new ConflictException(
        'La double authentification est déjà activée',
      );
    }
    const secret = this.totpService.generateSecret();
    await this.accounts.updateById(current.user_type, current.sub, {
      two_factor_secret: secret,
      two_factor_enabled: false,
    });
    return {
      secret,
      otpauth_url: this.totpService.buildOtpAuthUrl(
        user.email,
        this.config.twoFactorIssuer,
        secret,
      ),
    };
  }

  /** Confirme l'activation de la 2FA avec un premier code valide. */
  async confirmTwoFactor(
    current: AuthenticatedUser,
    code: string,
  ): Promise<{ two_factor_enabled: true }> {
    const user = await this.accounts.findById(
      current.user_type,
      current.sub,
      true,
    );
    if (!user) {
      throw new UnauthorizedException('Utilisateur introuvable');
    }
    if (user.two_factor_enabled) {
      throw new ConflictException(
        'La double authentification est déjà activée',
      );
    }
    if (!user.two_factor_secret) {
      throw new BadRequestException(
        "Aucune activation en cours : appelez d'abord /auth/2fa/enable",
      );
    }
    if (!(await this.totpService.verify(code, user.two_factor_secret))) {
      throw new BadRequestException('Code de vérification invalide');
    }
    await this.accounts.updateById(current.user_type, current.sub, {
      two_factor_enabled: true,
    });
    return { two_factor_enabled: true };
  }

  /** Désactive la 2FA après vérification d'un code valide. */
  async disableTwoFactor(
    current: AuthenticatedUser,
    code: string,
  ): Promise<{ two_factor_enabled: false }> {
    const user = await this.accounts.findById(
      current.user_type,
      current.sub,
      true,
    );
    if (!user) {
      throw new UnauthorizedException('Utilisateur introuvable');
    }
    if (!user.two_factor_enabled || !user.two_factor_secret) {
      throw new BadRequestException(
        "La double authentification n'est pas activée",
      );
    }
    if (!(await this.totpService.verify(code, user.two_factor_secret))) {
      throw new BadRequestException('Code de vérification invalide');
    }
    await this.accounts.updateById(current.user_type, current.sub, {
      two_factor_enabled: false,
      $unset: { two_factor_secret: 1 },
    });
    return { two_factor_enabled: false };
  }

  // ===========================================================================
  // INTERNES
  // ===========================================================================

  /**
   * Termine une connexion après validation du premier facteur : vérifie le
   * compte, réinitialise les échecs puis émet les jetons ou un défi 2FA.
   */
  private async completeLogin(
    account: UserAccount,
    client: ClientInfo,
  ): Promise<LoginResponse> {
    this.assertAccountUsable(account.user);

    if (account.user.two_factor_enabled && account.user.two_factor_secret) {
      if (account.user.failed_login_attempts || account.user.locked_until) {
        await this.accounts.updateById(account.type, String(account.user._id), {
          failed_login_attempts: 0,
          $unset: { locked_until: 1 },
        });
      }
      const payload: JwtPayload = {
        sub: String(account.user._id),
        user_type: account.type,
        email: account.user.email,
        roles: [],
        type: JwtTokenType.TWO_FACTOR,
      };
      return {
        requires_two_factor: true,
        two_factor_token: await this.signJwt(
          payload,
          this.config.twoFactorTtlSeconds,
        ),
        expires_in: this.config.twoFactorTtlSeconds,
      };
    }

    await this.recordSuccessfulLogin(account, client);
    return this.issueTokens(account, client);
  }

  /** Crée une session et signe le jeton d'accès. */
  private async issueTokens(
    account: UserAccount,
    client: ClientInfo,
  ): Promise<AuthTokensResponse> {
    const { session, refreshToken } = await this.sessionService.createSession({
      user_id: String(account.user._id),
      user_type: account.type,
      user_agent: client.user_agent,
      ip: client.ip,
      ttl_seconds: this.config.refreshTtlSeconds,
    });
    const accessToken = await this.signAccessToken(
      account,
      session._id.toString(),
    );
    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      expires_in: this.config.accessTtlSeconds,
      user: UserAccountsService.toProfile(account.user, account.type),
    };
  }

  /** Signe un JWT d'accès contenant le type d'utilisateur et ses rôles. */
  private async signAccessToken(
    account: UserAccount,
    sessionId: string,
  ): Promise<string> {
    const userId = String(account.user._id);
    let roleCodes: string[] = [];
    try {
      roleCodes = await this.userRoleService.getUserRoleCodes(userId, {
        userType: account.type,
      });
    } catch (error) {
      this.logger.warn(
        `Résolution des rôles impossible : ${(error as Error).message}`,
      );
    }
    const payload: JwtPayload = {
      sub: userId,
      user_type: account.type,
      email: account.user.email,
      roles: [...new Set([account.type, ...roleCodes])],
      sid: sessionId,
      type: JwtTokenType.ACCESS,
    };
    return this.signJwt(payload, this.config.accessTtlSeconds);
  }

  private signJwt(payload: JwtPayload, expiresIn: number): Promise<string> {
    return this.jwtService.signAsync(
      { ...payload },
      {
        secret: this.config.jwtSecret,
        expiresIn,
        ...(this.config.jwtIssuer ? { issuer: this.config.jwtIssuer } : {}),
      },
    );
  }

  private async verifyJwt(token: string): Promise<JwtPayload> {
    try {
      return await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.config.jwtSecret,
        ...(this.config.jwtIssuer ? { issuer: this.config.jwtIssuer } : {}),
      });
    } catch {
      throw new UnauthorizedException('Jeton invalide ou expiré');
    }
  }

  /**
   * Enregistre un échec de connexion. Renvoie `true` si le compte vient
   * d'être verrouillé.
   */
  private async registerFailedAttempt(account: UserAccount): Promise<boolean> {
    const attempts = (account.user.failed_login_attempts || 0) + 1;
    const userId = String(account.user._id);
    if (attempts >= this.config.maxFailedAttempts) {
      const lockedUntil = new Date(
        Date.now() + this.config.lockDurationSeconds * 1000,
      );
      account.user.failed_login_attempts = 0;
      account.user.locked_until = lockedUntil;
      await this.accounts.updateById(account.type, userId, {
        failed_login_attempts: 0,
        locked_until: lockedUntil,
      });
      this.logger.warn(
        `Compte ${account.type}/${userId} verrouillé jusqu'à ${lockedUntil.toISOString()}`,
      );
      return true;
    }
    account.user.failed_login_attempts = attempts;
    await this.accounts.updateById(account.type, userId, {
      failed_login_attempts: attempts,
    });
    return false;
  }

  private async recordSuccessfulLogin(
    account: UserAccount,
    client: ClientInfo,
  ): Promise<void> {
    await this.accounts.updateById(account.type, String(account.user._id), {
      failed_login_attempts: 0,
      $unset: { locked_until: 1 },
      last_login_at: new Date(),
      ...(client.ip ? { last_login_ip: client.ip.slice(0, 45) } : {}),
    });
  }

  private isLocked(user: AuthUserDocument): boolean {
    const lockedUntil = user.locked_until;
    return !!lockedUntil && new Date(lockedUntil).getTime() > Date.now();
  }

  private lockedException(accounts: UserAccount[]): HttpException {
    const until = accounts
      .map((a) => a.user.locked_until)
      .filter((d): d is Date => !!d)
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0];
    return new HttpException(
      {
        statusCode: HttpStatus.LOCKED,
        message:
          'Compte temporairement verrouillé suite à trop de tentatives échouées',
        locked_until: until ? new Date(until).toISOString() : undefined,
      },
      HttpStatus.LOCKED,
    );
  }

  private hasBlockingStatus(user: AuthUserDocument): boolean {
    return ['status', 'guest_status', 'owner_status'].some((field) => {
      const value = user[field] as unknown;
      return typeof value === 'string' && BLOCKING_STATUSES.has(value);
    });
  }

  /** Vérifie que le compte peut se connecter (actif, non bloqué). */
  private assertAccountUsable(user: AuthUserDocument): void {
    if (user.is_active === false || user.is_deleted) {
      throw new ForbiddenException('Compte désactivé');
    }
    if (this.hasBlockingStatus(user)) {
      throw new ForbiddenException('Compte suspendu ou bloqué');
    }
  }

  private async checkPassword(
    password: string,
    user: AuthUserDocument,
  ): Promise<boolean> {
    const hash = user.password_hash as string | undefined;
    if (!hash || !password) {
      return false;
    }
    try {
      return await bcrypt.compare(password, hash);
    } catch {
      return false;
    }
  }

  private hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.config.bcryptRounds);
  }

  private async getDummyHash(): Promise<string> {
    if (!this.dummyHash) {
      this.dummyHash = await bcrypt.hash(
        'dummy-password',
        this.config.bcryptRounds,
      );
    }
    return this.dummyHash;
  }

  /**
   * Crée un jeton à usage unique et invalide les jetons non utilisés du même
   * type pour ce compte. Renvoie le jeton en clair.
   */
  private async createAuthToken(
    type: AuthTokenType,
    account: UserAccount,
    ttlSeconds: number,
    client: ClientInfo,
  ): Promise<string> {
    const userId = new Types.ObjectId(String(account.user._id));
    await this.authTokenModel
      .deleteMany({
        user_id: userId,
        user_type: account.type,
        type,
        used_at: null,
      })
      .exec();

    const token = generateRandomToken(32);
    await this.authTokenModel.create({
      user_id: userId,
      user_type: account.type,
      type,
      token_hash: hashToken(token),
      expires_at: new Date(Date.now() + ttlSeconds * 1000),
      used_at: null,
      requested_ip: client.ip?.slice(0, 45),
      user_agent: client.user_agent?.slice(0, 500),
    });
    return token;
  }

  /**
   * Consomme un jeton à usage unique (atomique).
   * @throws BadRequestException si le jeton est inconnu, expiré ou déjà utilisé.
   */
  private async consumeAuthToken(
    token: string,
    type: AuthTokenType,
  ): Promise<AuthTokenDocument> {
    const tokenHash = hashToken(token ?? '');
    const existing = await this.authTokenModel
      .findOne({ token_hash: tokenHash, type })
      .exec();
    if (!existing) {
      throw new BadRequestException('Jeton invalide ou expiré');
    }
    if (existing.used_at) {
      throw new BadRequestException('Ce jeton a déjà été utilisé');
    }
    if (existing.expires_at.getTime() <= Date.now()) {
      throw new BadRequestException('Jeton invalide ou expiré');
    }

    const consumed = await this.authTokenModel
      .findOneAndUpdate(
        { _id: existing._id, used_at: null },
        { used_at: new Date() },
        { new: true },
      )
      .exec();
    if (!consumed) {
      throw new BadRequestException('Ce jeton a déjà été utilisé');
    }
    return consumed;
  }

  /** Appelle le notifier sans jamais faire échouer le flux d'authentification. */
  private async notify(
    method: keyof AuthNotifier,
    account: UserAccount,
    token: string,
    path: string,
  ): Promise<void> {
    const recipient: AuthNotificationRecipient = {
      email: account.user.email,
      first_name: account.user.first_name,
      user_type: account.type,
    };
    const link = `${this.config.frontendUrl}/auth/${path}?token=${encodeURIComponent(token)}`;
    try {
      await this.notifier[method](recipient, token, link);
    } catch (error) {
      this.logger.error(
        `Échec de l'envoi (${method}) : ${(error as Error).message}`,
      );
    }
  }

  /** Ajoute le jeton à la réponse hors production uniquement. */
  private withDevToken<T extends object>(
    response: T,
    token: string,
  ): T & { dev_token?: string } {
    return this.config.isProduction
      ? response
      : { ...response, dev_token: token };
  }
}
