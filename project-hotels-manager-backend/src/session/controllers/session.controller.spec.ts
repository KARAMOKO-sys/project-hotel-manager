import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { SessionController } from './session.controller';
import { SessionService } from '../services/session.service';
import { SessionRevokeReason } from '../schemas/session.entity';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { UserType } from '../../base-entities/enums/user-type.enum';
import { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';

describe('SessionController', () => {
  let controller: SessionController;
  let service: Record<string, jest.Mock>;
  const currentSid = new Types.ObjectId();
  const otherSid = new Types.ObjectId();
  const user: AuthenticatedUser = {
    sub: new Types.ObjectId().toString(),
    user_type: UserType.GUEST,
    email: 'a@b.c',
    roles: ['guest'],
    sid: currentSid.toString(),
  };

  beforeEach(async () => {
    service = {
      findActiveByUser: jest
        .fn()
        .mockResolvedValue([{ _id: currentSid }, { _id: otherSid }]),
      revokeAllForUser: jest.fn().mockResolvedValue(3),
      revoke: jest.fn().mockResolvedValue({}),
      purgeExpired: jest.fn().mockResolvedValue(5),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SessionController],
      providers: [{ provide: SessionService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();
    controller = module.get(SessionController);
  });

  it('lists my sessions and flags the current one', async () => {
    const result = await controller.findMine(user);
    expect(service.findActiveByUser).toHaveBeenCalledWith(
      user.sub,
      UserType.GUEST,
    );
    expect(result.map((s) => s.current)).toEqual([true, false]);
  });

  it('revokes all my other sessions', async () => {
    await expect(controller.revokeAllMine(user)).resolves.toEqual({
      revoked: 3,
    });
    expect(service.revokeAllForUser).toHaveBeenCalledWith(
      user.sub,
      UserType.GUEST,
      SessionRevokeReason.LOGOUT_ALL,
      user.sid,
    );
  });

  it('revokes one of my sessions with an ownership check', async () => {
    await controller.revokeMine(user, { id: otherSid.toString() });
    expect(service.revoke).toHaveBeenCalledWith(
      otherSid.toString(),
      user.sub,
      SessionRevokeReason.LOGOUT,
    );
  });

  it('admin routes delegate to the service', async () => {
    await controller.findByUser(
      { id: user.sub },
      { user_type: UserType.OWNER },
    );
    expect(service.findActiveByUser).toHaveBeenCalledWith(
      user.sub,
      UserType.OWNER,
    );
    await expect(controller.purge()).resolves.toEqual({ deleted: 5 });
    await controller.revoke({ id: otherSid.toString() });
    expect(service.revoke).toHaveBeenCalledWith(
      otherSid.toString(),
      undefined,
      SessionRevokeReason.ADMIN,
    );
  });
});
