/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import {
  AuthService,
  AuthTokensResponse,
  TwoFactorChallengeResponse,
} from './auth.service';
import { UserAccountsService } from './user-accounts.service';
import { TotpService } from './totp.service';
import { SessionService } from '../../session/services/session.service';
import { SessionRevokeReason } from '../../session/schemas/session.entity';
import { UserRoleService } from '../../user-role/services/user-role.service';
import { AuthToken, AuthTokenType } from '../schemas/auth-token.entity';
import { AUTH_NOTIFIER, JwtTokenType } from '../auth.constants';
import { hashToken } from '../utils/crypto.util';
import { UserType } from '../../base-entities/enums/user-type.enum';
import { Guest } from '../../guest/schemas/guest.entity';
import { Owner } from '../../owners/schemas/owner.entity';
import { SuperAdmin } from '../../admins/schemas/admin.entity';
import { Receptionist } from '../../receptionist/schemas/receptionist.entity';
import { HousekeepingStaff } from '../../housekeeping-staff/schemas/housekeeping-staff.entity';
import { Accountant } from '../../accountant/schemas/accountant.entity';
import { JwtPayload } from '../interfaces/authenticated-user.interface';

const SECRET = 'test-secret';
const PASSWORD = 'Password123';
const exec = (value: any) => ({ exec: jest.fn().mockResolvedValue(value) });

/** Applique une mise à jour Mongo simplifiée ($unset + champs). */
function applyUpdate(doc: any, update: any) {
  const { $unset, ...set } = update;
  Object.assign(doc, set);
  Object.keys($unset ?? {}).forEach((key) => delete doc[key]);
}

/** Faux modèle utilisateur pour une collection donnée. */
function createUserModel(store: any[]) {
  const find = (filter: any) =>
    store.find(
      (u) =>
        !u.is_deleted &&
        (filter.email ? u.email === filter.email : true) &&
        (filter._id ? String(u._id) === String(filter._id) : true),
    ) ?? null;

  const Model: any = function (this: any, data: any) {
    Object.assign(this, {
      _id: new Types.ObjectId(),
      failed_login_attempts: 0,
      is_active: true,
      is_email_verified: false,
      two_factor_enabled: false,
      ...data,
    });
    this.save = jest.fn().mockImplementation(() => {
      store.push(this);
      return Promise.resolve(this);
    });
  };
  Model.findOne = jest.fn((filter: any) => {
    const user = find(filter);
    return {
      select: () => exec(user),
      exec: jest.fn().mockResolvedValue(user),
    };
  });
  Model.exists = jest.fn((filter: any) =>
    exec(store.some((u) => u.email === filter.email) ? { _id: 1 } : null),
  );
  Model.updateOne = jest.fn((filter: any, update: any) => {
    const user = store.find((u) => String(u._id) === String(filter._id));
    if (user) applyUpdate(user, update);
    return exec({ modifiedCount: user ? 1 : 0 });
  });
  return Model;
}

/** Faux modèle AuthToken en mémoire. */
function createAuthTokenModel() {
  const store: any[] = [];
  const matches = (doc: any, filter: any) =>
    Object.entries(filter).every(([key, value]) =>
      value === null
        ? doc[key] === null || doc[key] === undefined
        : String(doc[key]) === String(value as string),
    );
  return {
    store,
    create: jest.fn((data: any) => {
      const doc = { _id: new Types.ObjectId(), ...data };
      store.push(doc);
      return Promise.resolve(doc);
    }),
    deleteMany: jest.fn((filter: any) => {
      const before = store.length;
      for (let i = store.length - 1; i >= 0; i--) {
        if (matches(store[i], filter)) store.splice(i, 1);
      }
      return exec({ deletedCount: before - store.length });
    }),
    findOne: jest.fn((filter: any) =>
      exec(store.find((d) => matches(d, filter)) ?? null),
    ),
    findOneAndUpdate: jest.fn((filter: any, update: any) => {
      const doc = store.find((d) => matches(d, filter)) ?? null;
      if (doc) Object.assign(doc, update);
      return exec(doc);
    }),
  };
}

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;
  let users: Record<string, any[]>;
  let models: Record<string, any>;
  let authTokenModel: ReturnType<typeof createAuthTokenModel>;
  let sessionService: Record<string, jest.Mock>;
  let userRoleService: Record<string, jest.Mock>;
  let totpService: Record<string, jest.Mock>;
  let notifier: Record<string, jest.Mock>;
  let passwordHash: string;
  let env: Record<string, string | undefined>;

  const client = { ip: '127.0.0.1', user_agent: 'jest' };

  beforeAll(async () => {
    passwordHash = await bcrypt.hash(PASSWORD, 4);
  });

  const makeUser = (overrides: any = {}) => ({
    _id: new Types.ObjectId(),
    email: 'awa@test.com',
    first_name: 'Awa',
    last_name: 'Koné',
    password_hash: passwordHash,
    failed_login_attempts: 0,
    is_active: true,
    is_email_verified: true,
    two_factor_enabled: false,
    ...overrides,
  });

  const addUser = (type: UserType, overrides: any = {}) => {
    const user = makeUser(overrides);
    users[type].push(user);
    return user;
  };

  async function build(extraEnv: Record<string, string> = {}) {
    env = {
      JWT_SECRET: SECRET,
      AUTH_BCRYPT_ROUNDS: '4',
      NODE_ENV: 'test',
      ...extraEnv,
    };
    users = Object.fromEntries(Object.values(UserType).map((t) => [t, []]));
    models = {
      [Guest.name]: createUserModel(users[UserType.GUEST]),
      [Owner.name]: createUserModel(users[UserType.OWNER]),
      [SuperAdmin.name]: createUserModel(users[UserType.SUPER_ADMIN]),
      [Receptionist.name]: createUserModel(users[UserType.RECEPTIONIST]),
      [HousekeepingStaff.name]: createUserModel(users[UserType.HOUSEKEEPING]),
      [Accountant.name]: createUserModel(users[UserType.ACCOUNTANT]),
    };
    authTokenModel = createAuthTokenModel();

    let sessionCounter = 0;
    sessionService = {
      createSession: jest.fn().mockImplementation(() => {
        sessionCounter += 1;
        return Promise.resolve({
          session: { _id: new Types.ObjectId() },
          refreshToken: `refresh-${sessionCounter}`,
        });
      }),
      rotate: jest.fn(),
      revoke: jest.fn().mockResolvedValue({}),
      revokeAllForUser: jest.fn().mockResolvedValue(2),
    };
    userRoleService = {
      assignRoleByCode: jest.fn().mockResolvedValue({}),
      getUserRoleCodes: jest.fn().mockResolvedValue(['guest']),
      getUserPermissions: jest.fn().mockResolvedValue(['reservations:read']),
    };
    totpService = {
      generateSecret: jest.fn().mockReturnValue('SECRETBASE32'),
      buildOtpAuthUrl: jest.fn().mockReturnValue('otpauth://totp/x'),
      verify: jest.fn().mockResolvedValue(true),
    };
    notifier = {
      sendEmailVerification: jest.fn().mockResolvedValue(undefined),
      sendPasswordReset: jest.fn().mockResolvedValue(undefined),
      sendMagicLink: jest.fn().mockResolvedValue(undefined),
    };
    jwtService = new JwtService({});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        UserAccountsService,
        ...Object.entries(models).map(([name, model]) => ({
          provide: getModelToken(name),
          useValue: model,
        })),
        { provide: getModelToken(AuthToken.name), useValue: authTokenModel },
        { provide: SessionService, useValue: sessionService },
        { provide: UserRoleService, useValue: userRoleService },
        { provide: TotpService, useValue: totpService },
        { provide: JwtService, useValue: jwtService },
        { provide: AUTH_NOTIFIER, useValue: notifier },
        {
          provide: ConfigService,
          useValue: { get: jest.fn((key: string) => env[key]) },
        },
      ],
    }).compile();
    service = module.get(AuthService);
  }

  beforeEach(() => build());

  const decode = (token: string) =>
    jwtService.verify<JwtPayload>(token, { secret: SECRET });

  /** Insère directement un jeton à usage unique. */
  const insertAuthToken = (
    type: AuthTokenType,
    user: any,
    userType: UserType,
    overrides: any = {},
  ) => {
    const raw = `raw-${type}-${Math.random()}`;
    authTokenModel.store.push({
      _id: new Types.ObjectId(),
      user_id: user._id,
      user_type: userType,
      type,
      token_hash: hashToken(raw),
      expires_at: new Date(Date.now() + 60_000),
      used_at: null,
      ...overrides,
    });
    return raw;
  };

  // ===========================================================================
  describe('register', () => {
    const dto = {
      first_name: 'Awa',
      last_name: 'Koné',
      email: 'new@test.com',
      password: PASSWORD,
      pseudo: 'awak',
    };

    it('rejects an email already used in any collection', async () => {
      addUser(UserType.OWNER, { email: 'new@test.com' });
      await expect(service.register(dto, client)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('maps a duplicate key error to 409', async () => {
      const spy = jest
        .spyOn(UserAccountsService.prototype, 'getModel')
        .mockReturnValueOnce(function (this: any) {
          this._id = new Types.ObjectId();
          this.save = () =>
            Promise.reject(Object.assign(new Error('dup'), { code: 11000 }));
        } as any);
      await expect(service.register(dto, client)).rejects.toBeInstanceOf(
        ConflictException,
      );
      spy.mockRestore();
    });

    it('creates a guest with a hashed password, default role and tokens', async () => {
      const result = await service.register(dto, client);

      const guest = users[UserType.GUEST][0];
      expect(guest.email).toBe('new@test.com');
      expect(guest.password_hash).not.toBe(PASSWORD);
      await expect(bcrypt.compare(PASSWORD, guest.password_hash)).resolves.toBe(
        true,
      );
      expect(guest.metadata).toEqual({ source: 'register', pseudo: 'awak' });

      expect(userRoleService.assignRoleByCode).toHaveBeenCalledWith(
        String(guest._id),
        UserType.GUEST,
        'guest',
      );
      expect(notifier.sendEmailVerification).toHaveBeenCalled();
      expect(authTokenModel.store[0].type).toBe(
        AuthTokenType.EMAIL_VERIFICATION,
      );

      expect(result.refresh_token).toBe('refresh-1');
      expect(result.user).toMatchObject({
        email: 'new@test.com',
        user_type: 'guest',
        pseudo: 'awak',
      });
      expect(result.user).not.toHaveProperty('password_hash');
      expect(result.dev_token).toBeDefined();
      const payload = decode(result.access_token);
      expect(payload).toMatchObject({
        user_type: 'guest',
        type: 'access',
        roles: ['guest'],
      });
    });

    it('still registers when role assignment fails', async () => {
      userRoleService.assignRoleByCode.mockRejectedValue(new Error('db'));
      await expect(service.register(dto, client)).resolves.toBeDefined();
    });

    it('does not expose dev tokens in production', async () => {
      await build({ NODE_ENV: 'production' });
      const result = await service.register(dto, client);
      expect(result.dev_token).toBeUndefined();
    });
  });

  // ===========================================================================
  describe('login', () => {
    it('rejects unknown emails', async () => {
      await expect(
        service.login({ email: 'nobody@test.com', password: PASSWORD }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('returns access + refresh tokens and a safe profile', async () => {
      const user = addUser(UserType.GUEST, { failed_login_attempts: 2 });
      const result = (await service.login(
        { email: user.email, password: PASSWORD },
        client,
      )) as AuthTokensResponse;

      expect(result.token_type).toBe('Bearer');
      expect(result.expires_in).toBe(15 * 60);
      expect(result.refresh_token).toBe('refresh-1');
      expect(result.user).not.toHaveProperty('password_hash');
      expect(result.user).not.toHaveProperty('two_factor_secret');
      const payload = decode(result.access_token);
      expect(payload.sub).toBe(String(user._id));
      expect(payload.type).toBe(JwtTokenType.ACCESS);
      expect(payload.sid).toBeDefined();
      expect(sessionService.createSession).toHaveBeenCalledWith(
        expect.objectContaining({
          user_type: UserType.GUEST,
          ip: '127.0.0.1',
          user_agent: 'jest',
        }),
      );
      expect(user.failed_login_attempts).toBe(0);
      expect(user.last_login_at).toBeInstanceOf(Date);
      expect(user.last_login_ip).toBe('127.0.0.1');
    });

    it('increments failed attempts on wrong password', async () => {
      const user = addUser(UserType.GUEST);
      await expect(
        service.login({ email: user.email, password: 'wrong-pass1' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(user.failed_login_attempts).toBe(1);
      expect(user.locked_until).toBeUndefined();
    });

    it('locks the account for 15 min after 5 failures', async () => {
      const user = addUser(UserType.GUEST);
      for (let i = 0; i < 4; i++) {
        await expect(
          service.login({ email: user.email, password: 'wrong-pass1' }),
        ).rejects.toBeInstanceOf(UnauthorizedException);
      }
      const error = await service
        .login({ email: user.email, password: 'wrong-pass1' })
        .catch((e) => e);
      expect(error).toBeInstanceOf(HttpException);
      expect(error.getStatus()).toBe(HttpStatus.LOCKED);

      const lockMs = new Date(user.locked_until).getTime() - Date.now();
      expect(lockMs).toBeGreaterThan(14 * 60 * 1000);
      expect(lockMs).toBeLessThanOrEqual(15 * 60 * 1000);

      // Même le bon mot de passe est refusé tant que le compte est verrouillé.
      const locked = await service
        .login({ email: user.email, password: PASSWORD })
        .catch((e) => e);
      expect(locked.getStatus()).toBe(HttpStatus.LOCKED);
    });

    it('allows login again once the lock has expired', async () => {
      const user = addUser(UserType.GUEST, {
        locked_until: new Date(Date.now() - 1000),
      });
      await expect(
        service.login({ email: user.email, password: PASSWORD }),
      ).resolves.toHaveProperty('access_token');
      expect(user.locked_until).toBeUndefined();
    });

    it('rejects inactive or blocked accounts', async () => {
      addUser(UserType.GUEST, { is_active: false });
      await expect(
        service.login({ email: 'awa@test.com', password: PASSWORD }),
      ).rejects.toBeInstanceOf(ForbiddenException);

      await build();
      addUser(UserType.GUEST, { guest_status: 'blocked' });
      await expect(
        service.login({ email: 'awa@test.com', password: PASSWORD }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('handles an email present in several collections', async () => {
      const otherHash = await bcrypt.hash('OtherPass123', 4);
      addUser(UserType.OWNER, { password_hash: otherHash });
      addUser(UserType.GUEST);

      const asGuest = (await service.login({
        email: 'awa@test.com',
        password: PASSWORD,
      })) as AuthTokensResponse;
      expect(asGuest.user.user_type).toBe(UserType.GUEST);

      const asOwner = (await service.login({
        email: 'awa@test.com',
        password: 'OtherPass123',
      })) as AuthTokensResponse;
      expect(asOwner.user.user_type).toBe(UserType.OWNER);

      await expect(
        service.login({
          email: 'awa@test.com',
          password: PASSWORD,
          user_type: UserType.OWNER,
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('includes assigned roles (e.g. guest + owner) in the access token', async () => {
      userRoleService.getUserRoleCodes.mockResolvedValue(['guest', 'owner']);
      addUser(UserType.GUEST);
      const result = (await service.login({
        email: 'awa@test.com',
        password: PASSWORD,
      })) as AuthTokensResponse;
      expect(decode(result.access_token).roles).toEqual(['guest', 'owner']);
    });
  });

  // ===========================================================================
  describe('two-factor login', () => {
    let user: any;

    beforeEach(() => {
      user = addUser(UserType.GUEST, {
        two_factor_enabled: true,
        two_factor_secret: 'SECRETBASE32',
      });
    });

    const challenge = async () =>
      (await service.login({
        email: user.email,
        password: PASSWORD,
      })) as TwoFactorChallengeResponse;

    it('returns a short-lived 2FA token instead of session tokens', async () => {
      const result = await challenge();
      expect(result.requires_two_factor).toBe(true);
      expect(result.expires_in).toBe(300);
      expect(result).not.toHaveProperty('access_token');
      expect(decode(result.two_factor_token).type).toBe(
        JwtTokenType.TWO_FACTOR,
      );
      expect(sessionService.createSession).not.toHaveBeenCalled();
    });

    it('completes the login with a valid TOTP code', async () => {
      const { two_factor_token } = await challenge();
      const result = await service.verifyTwoFactorLogin(
        { two_factor_token, code: '123456' },
        client,
      );
      expect(totpService.verify).toHaveBeenCalledWith('123456', 'SECRETBASE32');
      expect(decode(result.access_token).type).toBe(JwtTokenType.ACCESS);
      expect(user.last_login_at).toBeInstanceOf(Date);
    });

    it('rejects an invalid code and counts the failure', async () => {
      const { two_factor_token } = await challenge();
      totpService.verify.mockResolvedValue(false);
      await expect(
        service.verifyTwoFactorLogin({ two_factor_token, code: '000000' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(user.failed_login_attempts).toBe(1);
    });

    it('rejects access tokens and garbage used as 2FA tokens', async () => {
      user.two_factor_enabled = false;
      const login = (await service.login({
        email: user.email,
        password: PASSWORD,
      })) as AuthTokensResponse;
      await expect(
        service.verifyTwoFactorLogin({
          two_factor_token: login.access_token,
          code: '123456',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      await expect(
        service.verifyTwoFactorLogin({
          two_factor_token: 'garbage',
          code: '123456',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  // ===========================================================================
  describe('refresh / logout', () => {
    it('rotates the refresh token and issues a new access token', async () => {
      const user = addUser(UserType.GUEST);
      const sessionId = new Types.ObjectId();
      sessionService.rotate.mockResolvedValue({
        session: {
          _id: sessionId,
          user_id: user._id,
          user_type: UserType.GUEST,
        },
        refreshToken: 'rotated',
      });

      const result = await service.refresh('old-token', client);
      expect(sessionService.rotate).toHaveBeenCalledWith('old-token', client);
      expect(result.refresh_token).toBe('rotated');
      expect(decode(result.access_token).sid).toBe(sessionId.toString());
    });

    it('propagates the rejection of a reused/revoked refresh token', async () => {
      sessionService.rotate.mockRejectedValue(
        new UnauthorizedException('Refresh token révoqué'),
      );
      await expect(service.refresh('reused')).rejects.toThrow('révoqué');
    });

    it('revokes the new session when the account is no longer usable', async () => {
      const user = addUser(UserType.GUEST, { is_active: false });
      const sessionId = new Types.ObjectId();
      sessionService.rotate.mockResolvedValue({
        session: {
          _id: sessionId,
          user_id: user._id,
          user_type: UserType.GUEST,
        },
        refreshToken: 'rotated',
      });
      await expect(service.refresh('t')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(sessionService.revoke).toHaveBeenCalledWith(
        sessionId.toString(),
        undefined,
        SessionRevokeReason.ADMIN,
      );
    });

    it('logout revokes the current session, logoutAll every session', async () => {
      const current = {
        sub: new Types.ObjectId().toString(),
        user_type: UserType.GUEST,
        email: 'a@b.c',
        roles: [],
        sid: new Types.ObjectId().toString(),
      };
      await expect(service.logout(current)).resolves.toEqual({ success: true });
      expect(sessionService.revoke).toHaveBeenCalledWith(
        current.sid,
        current.sub,
        SessionRevokeReason.LOGOUT,
      );
      await expect(service.logoutAll(current)).resolves.toEqual({ revoked: 2 });
      expect(sessionService.revokeAllForUser).toHaveBeenCalledWith(
        current.sub,
        UserType.GUEST,
        SessionRevokeReason.LOGOUT_ALL,
      );
    });
  });

  // ===========================================================================
  describe('password reset', () => {
    it('answers generically for unknown emails', async () => {
      const result = await service.requestPasswordReset({
        email: 'x@test.com',
      });
      expect(result.message).toBeDefined();
      expect(result.dev_token).toBeUndefined();
      expect(authTokenModel.create).not.toHaveBeenCalled();
    });

    it('creates a hashed one-time token and notifies the user', async () => {
      addUser(UserType.GUEST);
      const result = await service.requestPasswordReset({
        email: 'awa@test.com',
      });
      expect(result.dev_token).toBeDefined();
      const stored = authTokenModel.store[0];
      expect(stored.type).toBe(AuthTokenType.PASSWORD_RESET);
      expect(stored.token_hash).toBe(hashToken(result.dev_token!));
      expect(stored.token_hash).not.toBe(result.dev_token);
      expect(notifier.sendPasswordReset).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'awa@test.com' }),
        result.dev_token,
        expect.stringContaining('/auth/reset-password?token='),
      );
    });

    it('invalidates previous unused reset tokens', async () => {
      addUser(UserType.GUEST);
      await service.requestPasswordReset({ email: 'awa@test.com' });
      await service.requestPasswordReset({ email: 'awa@test.com' });
      expect(authTokenModel.store).toHaveLength(1);
    });

    it('resets the password, unlocks and revokes all sessions', async () => {
      const user = addUser(UserType.GUEST, {
        failed_login_attempts: 3,
        locked_until: new Date(Date.now() + 60_000),
      });
      const { dev_token } = await service.requestPasswordReset({
        email: user.email,
      });
      await service.resetPassword({
        token: dev_token!,
        new_password: 'NewPass456',
      });

      await expect(
        bcrypt.compare('NewPass456', user.password_hash),
      ).resolves.toBe(true);
      expect(user.locked_until).toBeUndefined();
      expect(sessionService.revokeAllForUser).toHaveBeenCalledWith(
        String(user._id),
        UserType.GUEST,
        SessionRevokeReason.PASSWORD_CHANGED,
      );
    });

    it('rejects expired tokens', async () => {
      const user = addUser(UserType.GUEST);
      const raw = insertAuthToken(
        AuthTokenType.PASSWORD_RESET,
        user,
        UserType.GUEST,
        {
          expires_at: new Date(Date.now() - 1000),
        },
      );
      await expect(
        service.resetPassword({ token: raw, new_password: 'NewPass456' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(user.password_hash).toBe(passwordHash);
    });

    it('rejects unknown tokens and tokens of another type', async () => {
      const user = addUser(UserType.GUEST);
      const magic = insertAuthToken(
        AuthTokenType.MAGIC_LINK,
        user,
        UserType.GUEST,
      );
      await expect(
        service.resetPassword({ token: magic, new_password: 'NewPass456' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        service.resetPassword({ token: 'nope', new_password: 'NewPass456' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  // ===========================================================================
  describe('changePassword', () => {
    const current = (user: any) => ({
      sub: String(user._id),
      user_type: UserType.GUEST,
      email: user.email,
      roles: [],
      sid: 'current-sid',
    });

    it('rejects a wrong current password', async () => {
      const user = addUser(UserType.GUEST);
      await expect(
        service.changePassword(current(user), {
          current_password: 'bad',
          new_password: 'NewPass456',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects reusing the same password', async () => {
      const user = addUser(UserType.GUEST);
      await expect(
        service.changePassword(current(user), {
          current_password: PASSWORD,
          new_password: PASSWORD,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('changes the password and revokes other sessions', async () => {
      const user = addUser(UserType.GUEST);
      await service.changePassword(current(user), {
        current_password: PASSWORD,
        new_password: 'NewPass456',
      });
      await expect(
        bcrypt.compare('NewPass456', user.password_hash),
      ).resolves.toBe(true);
      expect(sessionService.revokeAllForUser).toHaveBeenCalledWith(
        String(user._id),
        UserType.GUEST,
        SessionRevokeReason.PASSWORD_CHANGED,
        'current-sid',
      );
    });
  });

  // ===========================================================================
  describe('magic link', () => {
    it('generates a 15 minute token', async () => {
      addUser(UserType.GUEST);
      const { dev_token } = await service.generateMagicLink({
        email: 'awa@test.com',
      });
      const stored = authTokenModel.store[0];
      expect(stored.type).toBe(AuthTokenType.MAGIC_LINK);
      const ttl = stored.expires_at.getTime() - Date.now();
      expect(ttl).toBeGreaterThan(14 * 60 * 1000);
      expect(ttl).toBeLessThanOrEqual(15 * 60 * 1000);
      expect(dev_token).toBeDefined();
      expect(notifier.sendMagicLink).toHaveBeenCalled();
    });

    it('answers generically for unknown or inactive accounts', async () => {
      addUser(UserType.GUEST, { is_active: false });
      const result = await service.generateMagicLink({ email: 'awa@test.com' });
      expect(result.dev_token).toBeUndefined();
      expect(authTokenModel.create).not.toHaveBeenCalled();
    });

    it('logs in once and rejects a second use', async () => {
      const user = addUser(UserType.GUEST, { is_email_verified: false });
      const { dev_token } = await service.generateMagicLink({
        email: user.email,
      });

      const result = (await service.loginWithMagicLink(
        dev_token!,
        client,
      )) as AuthTokensResponse;
      expect(result.access_token).toBeDefined();
      expect(user.is_email_verified).toBe(true);

      await expect(service.loginWithMagicLink(dev_token!)).rejects.toThrow(
        'déjà été utilisé',
      );
    });

    it('rejects expired magic links', async () => {
      const user = addUser(UserType.GUEST);
      const raw = insertAuthToken(
        AuthTokenType.MAGIC_LINK,
        user,
        UserType.GUEST,
        {
          expires_at: new Date(Date.now() - 1),
        },
      );
      await expect(service.loginWithMagicLink(raw)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('still requires 2FA when enabled', async () => {
      const user = addUser(UserType.GUEST, {
        two_factor_enabled: true,
        two_factor_secret: 'S',
      });
      const raw = insertAuthToken(
        AuthTokenType.MAGIC_LINK,
        user,
        UserType.GUEST,
      );
      await expect(service.loginWithMagicLink(raw)).resolves.toHaveProperty(
        'requires_two_factor',
        true,
      );
    });
  });

  // ===========================================================================
  describe('email verification', () => {
    it('marks the email as verified (single use)', async () => {
      const user = addUser(UserType.GUEST, { is_email_verified: false });
      const raw = insertAuthToken(
        AuthTokenType.EMAIL_VERIFICATION,
        user,
        UserType.GUEST,
      );
      await service.verifyEmail(raw);
      expect(user.is_email_verified).toBe(true);
      await expect(service.verifyEmail(raw)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  // ===========================================================================
  describe('two-factor management', () => {
    const current = (user: any) => ({
      sub: String(user._id),
      user_type: UserType.GUEST,
      email: user.email,
      roles: [],
    });

    it('enable → confirm → disable', async () => {
      const user = addUser(UserType.GUEST);

      const setup = await service.enableTwoFactor(current(user));
      expect(setup).toEqual({
        secret: 'SECRETBASE32',
        otpauth_url: 'otpauth://totp/x',
      });
      expect(totpService.buildOtpAuthUrl).toHaveBeenCalledWith(
        user.email,
        'PleasantStay',
        'SECRETBASE32',
      );
      expect(user.two_factor_secret).toBe('SECRETBASE32');
      expect(user.two_factor_enabled).toBe(false);

      await service.confirmTwoFactor(current(user), '123456');
      expect(user.two_factor_enabled).toBe(true);

      await expect(
        service.enableTwoFactor(current(user)),
      ).rejects.toBeInstanceOf(ConflictException);

      await service.disableTwoFactor(current(user), '123456');
      expect(user.two_factor_enabled).toBe(false);
      expect(user.two_factor_secret).toBeUndefined();
    });

    it('confirm requires a pending secret and a valid code', async () => {
      const user = addUser(UserType.GUEST);
      await expect(
        service.confirmTwoFactor(current(user), '123456'),
      ).rejects.toBeInstanceOf(BadRequestException);

      user.two_factor_secret = 'S';
      totpService.verify.mockResolvedValue(false);
      await expect(
        service.confirmTwoFactor(current(user), '000000'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(user.two_factor_enabled).toBe(false);
    });

    it('disable requires 2FA to be enabled and a valid code', async () => {
      const user = addUser(UserType.GUEST);
      await expect(
        service.disableTwoFactor(current(user), '123456'),
      ).rejects.toBeInstanceOf(BadRequestException);

      user.two_factor_enabled = true;
      user.two_factor_secret = 'S';
      totpService.verify.mockResolvedValue(false);
      await expect(
        service.disableTwoFactor(current(user), '000000'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(user.two_factor_enabled).toBe(true);
    });
  });

  // ===========================================================================
  describe('me', () => {
    it('returns profile, roles and permissions', async () => {
      const user = addUser(UserType.GUEST);
      userRoleService.getUserRoleCodes.mockResolvedValue(['guest', 'owner']);
      const result = await service.me({
        sub: String(user._id),
        user_type: UserType.GUEST,
        email: user.email,
        roles: [],
      });
      expect(result).toMatchObject({
        email: user.email,
        roles: ['guest', 'owner'],
        permissions: ['reservations:read'],
      });
      expect(result).not.toHaveProperty('password_hash');
    });

    it('throws when the user no longer exists', async () => {
      await expect(
        service.me({
          sub: new Types.ObjectId().toString(),
          user_type: UserType.GUEST,
          email: 'x',
          roles: [],
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});
