/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { AuthController } from './auth.controller';
import { AuthService } from '../services/auth.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { IS_PUBLIC_KEY } from '../auth.constants';
import { UserType } from '../../base-entities/enums/user-type.enum';

describe('AuthController', () => {
  let controller: AuthController;
  let service: Record<string, jest.Mock>;
  const client = { ip: '1.1.1.1', user_agent: 'jest' };
  const user = { sub: '1', user_type: UserType.GUEST, email: 'a', roles: [] };

  beforeEach(async () => {
    service = Object.fromEntries(
      [
        'register',
        'login',
        'verifyTwoFactorLogin',
        'refresh',
        'requestPasswordReset',
        'resetPassword',
        'generateMagicLink',
        'loginWithMagicLink',
        'verifyEmail',
        'me',
        'logout',
        'logoutAll',
        'changePassword',
        'enableTwoFactor',
        'confirmTwoFactor',
        'disableTwoFactor',
      ].map((name) => [name, jest.fn().mockResolvedValue({ ok: name })]),
    );
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();
    controller = module.get(AuthController);
  });

  it('marks only the anonymous routes as public', () => {
    const reflector = new Reflector();
    const isPublic = (method: keyof AuthController) =>
      !!reflector.get(IS_PUBLIC_KEY, AuthController.prototype[method]);

    [
      'register',
      'login',
      'verifyTwoFactor',
      'refresh',
      'forgotPassword',
      'resetPassword',
      'magicLink',
      'verifyMagicLink',
      'verifyEmail',
    ].forEach((m) => expect(isPublic(m as keyof AuthController)).toBe(true));

    [
      'me',
      'logout',
      'logoutAll',
      'changePassword',
      'enableTwoFactor',
      'confirmTwoFactor',
      'disableTwoFactor',
    ].forEach((m) => expect(isPublic(m as keyof AuthController)).toBe(false));
  });

  it('delegates public routes with client info', async () => {
    const dto: any = { email: 'a@b.c', password: 'x' };
    await controller.register(dto, client);
    await controller.login(dto, client);
    await controller.refresh({ refresh_token: 'r' }, client);
    await controller.verifyTwoFactor(
      { two_factor_token: 't', code: '123456' },
      client,
    );
    await controller.forgotPassword({ email: 'a@b.c' }, client);
    await controller.resetPassword({ token: 't', new_password: 'Abcdef12' });
    await controller.magicLink({ email: 'a@b.c' }, client);
    await controller.verifyMagicLink({ token: 'm' }, client);
    await controller.verifyEmail({ token: 'e' });

    expect(service.register).toHaveBeenCalledWith(dto, client);
    expect(service.login).toHaveBeenCalledWith(dto, client);
    expect(service.refresh).toHaveBeenCalledWith('r', client);
    expect(service.loginWithMagicLink).toHaveBeenCalledWith('m', client);
    expect(service.verifyEmail).toHaveBeenCalledWith('e');
  });

  it('delegates authenticated routes with the current user', async () => {
    await controller.me(user);
    await controller.logout(user);
    await controller.logoutAll(user);
    await controller.changePassword(user, {
      current_password: 'a',
      new_password: 'Abcdef12',
    });
    await controller.enableTwoFactor(user);
    await controller.confirmTwoFactor(user, { code: '123456' });
    await controller.disableTwoFactor(user, { code: '654321' });

    expect(service.me).toHaveBeenCalledWith(user);
    expect(service.logoutAll).toHaveBeenCalledWith(user);
    expect(service.confirmTwoFactor).toHaveBeenCalledWith(user, '123456');
    expect(service.disableTwoFactor).toHaveBeenCalledWith(user, '654321');
  });
});
