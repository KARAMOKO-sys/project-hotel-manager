/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IS_PUBLIC_KEY, JwtTokenType } from '../auth.constants';
import { UserType } from '../../base-entities/enums/user-type.enum';

const SECRET = 'guard-secret';

function createContext(headers: Record<string, string> = {}) {
  const request: any = { headers };
  const context = {
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { context, request };
}

describe('JwtAuthGuard', () => {
  const jwt = new JwtService({});
  let reflector: Reflector;
  let guard: JwtAuthGuard;

  const sign = (payload: any, secret = SECRET, expiresIn = 60) =>
    jwt.sign(payload, { secret, expiresIn });

  const accessPayload = {
    sub: '507f1f77bcf86cd799439011',
    user_type: UserType.GUEST,
    email: 'a@b.c',
    roles: ['guest'],
    sid: '507f1f77bcf86cd799439012',
    type: JwtTokenType.ACCESS,
  };

  beforeEach(() => {
    reflector = new Reflector();
    const config = {
      get: jest.fn((key: string) =>
        key === 'JWT_SECRET' ? SECRET : undefined,
      ),
    } as unknown as ConfigService;
    guard = new JwtAuthGuard(jwt, reflector, config);
  });

  it('lets public routes through without a token', async () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockImplementation((key) => key === IS_PUBLIC_KEY);
    const { context } = createContext();
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('rejects requests without a token', async () => {
    const { context } = createContext();
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects non-Bearer schemes', async () => {
    const { context } = createContext({
      authorization: `Basic ${sign(accessPayload)}`,
    });
    await expect(guard.canActivate(context)).rejects.toThrow('manquant');
  });

  it.each([
    ['garbage', 'not.a.jwt'],
    ['wrong secret', sign(accessPayload, 'other-secret')],
    [
      'expired',
      jwt.sign(
        { ...accessPayload, exp: Math.floor(Date.now() / 1000) - 10 },
        { secret: SECRET },
      ),
    ],
    [
      '2FA temp token',
      sign({ ...accessPayload, type: JwtTokenType.TWO_FACTOR }),
    ],
  ])('rejects an invalid token (%s)', async (_label, token) => {
    const { context } = createContext({ authorization: `Bearer ${token}` });
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('accepts a valid access token and attaches the user', async () => {
    const { context, request } = createContext({
      authorization: `Bearer ${sign(accessPayload)}`,
    });
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual({
      sub: accessPayload.sub,
      user_type: UserType.GUEST,
      email: 'a@b.c',
      roles: ['guest'],
      sid: accessPayload.sid,
    });
  });
});
