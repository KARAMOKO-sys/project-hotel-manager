/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import {
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { SessionService } from './session.service';
import { Session, SessionRevokeReason } from '../schemas/session.entity';
import { UserType } from '../../base-entities/enums/user-type.enum';

/**
 * Faux modèle Mongoose en mémoire, suffisant pour les requêtes du service.
 */
function createFakeSessionModel() {
  const store: any[] = [];

  const eq = (a: any, b: any) => {
    if (a === null || a === undefined) return b === null || b === undefined;
    if (b === null || b === undefined) return false;
    return a.toString() === b.toString();
  };
  const matches = (doc: any, filter: any): boolean =>
    Object.entries(filter).every(([key, cond]: [string, any]) => {
      if (key === '$or') return cond.some((f: any) => matches(doc, f));
      const value = doc[key];
      if (
        cond &&
        typeof cond === 'object' &&
        !(cond instanceof Types.ObjectId) &&
        !(cond instanceof Date)
      ) {
        if ('$ne' in cond && eq(value, cond.$ne)) return false;
        if ('$gt' in cond && !(value > cond.$gt)) return false;
        if ('$lte' in cond && !(value && value <= cond.$lte)) return false;
        return true;
      }
      return eq(value, cond);
    });
  const exec = (value: any) => ({ exec: jest.fn().mockResolvedValue(value) });

  const Model: any = function (this: any, data: any) {
    Object.assign(this, { _id: new Types.ObjectId(), ...data });
    this.save = jest.fn().mockImplementation(() => {
      if (!store.includes(this)) store.push(this);
      return Promise.resolve(this);
    });
  };
  Model.store = store;
  Model.findById = jest.fn((id: string) => {
    const doc = store.find((d) => eq(d._id, id)) ?? null;
    return { select: () => exec(doc), exec: jest.fn().mockResolvedValue(doc) };
  });
  Model.find = jest.fn((filter: any) => {
    const docs = store.filter((d) => matches(d, filter));
    const chain: any = {
      sort: () => chain,
      lean: () => chain,
      exec: () => Promise.resolve(docs),
    };
    return chain;
  });
  Model.findOneAndUpdate = jest.fn((filter: any, update: any) => {
    const doc = store.find((d) => matches(d, filter)) ?? null;
    if (doc) Object.assign(doc, update);
    return exec(doc);
  });
  Model.updateMany = jest.fn((filter: any, update: any) => {
    const docs = store.filter((d) => matches(d, filter));
    docs.forEach((d) => Object.assign(d, update));
    return exec({ modifiedCount: docs.length });
  });
  Model.updateOne = jest.fn(() => exec({ modifiedCount: 1 }));
  Model.deleteOne = jest.fn((filter: any) => {
    const index = store.findIndex((d) => matches(d, filter));
    if (index >= 0) store.splice(index, 1);
    return exec({ deletedCount: index >= 0 ? 1 : 0 });
  });
  Model.deleteMany = jest.fn((filter: any) => {
    const before = store.length;
    for (let i = store.length - 1; i >= 0; i--) {
      if (matches(store[i], filter)) store.splice(i, 1);
    }
    return exec({ deletedCount: before - store.length });
  });
  return Model;
}

describe('SessionService', () => {
  let service: SessionService;
  let model: any;
  const userId = new Types.ObjectId().toString();

  beforeEach(async () => {
    model = createFakeSessionModel();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
        { provide: getModelToken(Session.name), useValue: model },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue(undefined) },
        },
      ],
    }).compile();
    service = module.get(SessionService);
  });

  const create = () =>
    service.createSession({
      user_id: userId,
      user_type: UserType.GUEST,
      user_agent: 'jest',
      ip: '127.0.0.1',
    });

  it('uses a 30 day refresh TTL by default', () => {
    expect(service.refreshTtlSeconds).toBe(30 * 24 * 3600);
  });

  it('creates a session storing only the token hash', async () => {
    const { session, refreshToken } = await create();
    const [id, secret] = refreshToken.split('.');
    expect(id).toBe(session._id.toString());
    expect(session.refresh_token_hash).toBeDefined();
    expect(session.refresh_token_hash).not.toContain(secret);
    expect(session.expires_at.getTime()).toBeGreaterThan(Date.now());
    expect(model.store).toHaveLength(1);
  });

  it('validates a correct refresh token', async () => {
    const { session, refreshToken } = await create();
    await expect(service.validateRefreshToken(refreshToken)).resolves.toBe(
      session,
    );
  });

  it.each(['garbage', 'abc.def', `${new Types.ObjectId().toString()}.x`])(
    'rejects malformed/unknown token %s',
    async (token) => {
      await expect(service.validateRefreshToken(token)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    },
  );

  it('rejects a token with a wrong secret', async () => {
    const { refreshToken } = await create();
    const [id] = refreshToken.split('.');
    await expect(
      service.validateRefreshToken(`${id}.wrong-secret`),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects an expired token', async () => {
    const { session, refreshToken } = await create();
    session.expires_at = new Date(Date.now() - 1000);
    await expect(service.validateRefreshToken(refreshToken)).rejects.toThrow(
      'expiré',
    );
  });

  it('rotates: revokes the old session and issues a new token', async () => {
    const first = await create();
    const second = await service.rotate(first.refreshToken, { ip: '10.0.0.1' });

    expect(second.refreshToken).not.toBe(first.refreshToken);
    expect(first.session.revoked_at).toBeInstanceOf(Date);
    expect(first.session.revoked_reason).toBe(SessionRevokeReason.ROTATED);
    expect(first.session.replaced_by).toEqual(second.session._id);
    expect(second.session.ip).toBe('10.0.0.1');
    await expect(
      service.validateRefreshToken(second.refreshToken),
    ).resolves.toBe(second.session);
  });

  it('detects reuse of a rotated token and revokes every session', async () => {
    const first = await create();
    const second = await service.rotate(first.refreshToken);

    await expect(service.rotate(first.refreshToken)).rejects.toThrow('révoqué');
    expect(second.session.revoked_at).toBeInstanceOf(Date);
    expect(second.session.revoked_reason).toBe(SessionRevokeReason.TOKEN_REUSE);
  });

  it('lists active sessions only', async () => {
    const a = await create();
    await create();
    await service.revoke(a.session._id.toString());
    const active = await service.findActiveByUser(userId, UserType.GUEST);
    expect(active).toHaveLength(1);
  });

  it('revoke checks ownership', async () => {
    const { session } = await create();
    await expect(
      service.revoke(session._id.toString(), new Types.ObjectId().toString()),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.revoke(new Types.ObjectId().toString()),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.revoke('not-an-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );

    const revoked = await service.revoke(session._id.toString(), userId);
    expect(revoked.revoked_reason).toBe(SessionRevokeReason.LOGOUT);
  });

  it('revokeAllForUser keeps the excepted session', async () => {
    const current = await create();
    await create();
    await create();
    const count = await service.revokeAllForUser(
      userId,
      UserType.GUEST,
      SessionRevokeReason.LOGOUT_ALL,
      current.session._id.toString(),
    );
    expect(count).toBe(2);
    expect(current.session.revoked_at).toBeNull();
  });

  it('purges expired and old revoked sessions', async () => {
    const expired = await create();
    expired.session.expires_at = new Date(Date.now() - 1000);
    const oldRevoked = await create();
    oldRevoked.session.revoked_at = new Date(Date.now() - 30 * 86400 * 1000);
    await create();

    await expect(service.purgeExpired()).resolves.toBe(2);
    expect(model.store).toHaveLength(1);
  });
});
