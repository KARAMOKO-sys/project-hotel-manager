/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { AuditLogService } from './audit-log.service';
import {
  AuditAction,
  AuditLog,
  AuditLogSchema,
} from '../schemas/audit-log.entity';

const execOf = (value: unknown) => ({
  exec: jest.fn().mockResolvedValue(value),
});
const chainOf = (value: unknown) => ({
  sort: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  lean: jest.fn().mockReturnThis(),
  exec: jest.fn().mockResolvedValue(value),
});

describe('AuditLogService', () => {
  let service: AuditLogService;
  let model: any;
  const actorId = new Types.ObjectId();
  const entry = {
    _id: new Types.ObjectId(),
    actor_id: actorId,
    action: 'update',
    entity_type: 'Reservation',
    entity_id: 'abc',
  };

  beforeEach(async () => {
    const ModelMock: any = function (data: any) {
      const doc = { ...data };
      doc.save = jest.fn().mockResolvedValue(doc);
      return doc;
    };
    ModelMock.findById = jest.fn().mockReturnValue(execOf(entry));
    ModelMock.findByIdAndUpdate = jest.fn();
    ModelMock.find = jest.fn().mockReturnValue(chainOf([entry]));
    ModelMock.countDocuments = jest.fn().mockReturnValue(execOf(1));
    model = ModelMock;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogService,
        { provide: getModelToken(AuditLog.name), useValue: model },
      ],
    }).compile();

    service = module.get<AuditLogService>(AuditLogService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('normalizes the action and computes the diff', async () => {
      const result = await service.create({
        actor_id: actorId.toString(),
        action: ' UPDATE ',
        entity_type: 'Reservation',
        entity_id: 'abc',
        old_values: { status: 'pending', adults: 2, updated_at: 1 },
        new_values: { status: 'confirmed', adults: 2, updated_at: 2 },
      });
      expect(result.action).toBe('update');
      expect(result.actor_type).toBe('user');
      expect(result.changes).toEqual([
        { field: 'status', old_value: 'pending', new_value: 'confirmed' },
      ]);
    });

    it('defaults to a system actor and keeps provided changes', async () => {
      const changes = [{ field: 'x', old_value: 1, new_value: 2 }];
      const result = await service.log({
        action: AuditAction.EXPORT,
        changes,
      });
      expect(result.actor_type).toBe('system');
      expect(result.changes).toEqual(changes);
    });
  });

  describe('computeChanges', () => {
    it('detects added, removed and nested changes', () => {
      expect(
        service.computeChanges(
          { a: 1, b: { c: 1 }, gone: true },
          { a: 1, b: { c: 2 }, added: 'x' },
        ),
      ).toEqual([
        { field: 'b', old_value: { c: 1 }, new_value: { c: 2 } },
        { field: 'gone', old_value: true, new_value: undefined },
        { field: 'added', old_value: undefined, new_value: 'x' },
      ]);
    });

    it('returns [] without values', () => {
      expect(service.computeChanges()).toEqual([]);
    });
  });

  describe('immutability', () => {
    it('forbids update', async () => {
      await expect(service.update()).rejects.toBeInstanceOf(ForbiddenException);
      expect(model.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('forbids remove', async () => {
      await expect(service.remove()).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('forbids restore', async () => {
      await expect(service.restore()).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('registers schema hooks blocking updates', () => {
      const hooks = (AuditLogSchema as any).s.hooks._pres;
      expect(hooks.get('findOneAndUpdate')?.length).toBeGreaterThan(0);
      expect(hooks.get('updateOne')?.length).toBeGreaterThan(0);
    });
  });

  it('findOne throws 404 when missing', async () => {
    model.findById.mockReturnValue(execOf(null));
    await expect(service.findOne(entry._id.toString())).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  describe('queries', () => {
    it('findAll applies filters', async () => {
      await service.findAll({
        page: 1,
        limit: 10,
        action: 'LOGIN',
        actor_id: actorId.toString(),
        from: '2026-10-01',
      });
      const filter = model.find.mock.calls[0][0];
      expect(filter.action).toBe('login');
      expect(filter.actor_id).toEqual(actorId);
      expect(filter.created_at.$gte).toEqual(new Date('2026-10-01'));
    });

    it('findByEntity filters on entity type and id', async () => {
      const result = await service.findByEntity('Reservation', 'abc', {
        page: 1,
        limit: 10,
      });
      expect(model.find.mock.calls[0][0]).toMatchObject({
        entity_type: 'Reservation',
        entity_id: 'abc',
      });
      expect(result.data).toEqual([entry]);
    });

    it('findByActor filters on actor_id', async () => {
      await service.findByActor(actorId.toString(), { page: 1, limit: 10 });
      expect(model.find.mock.calls[0][0].actor_id).toEqual(actorId);
    });

    it('findByDateRange builds the range', async () => {
      await service.findByDateRange('2026-10-01', '2026-10-31', {
        page: 1,
        limit: 10,
      });
      expect(model.find.mock.calls[0][0].created_at).toEqual({
        $gte: new Date('2026-10-01'),
        $lte: new Date('2026-10-31'),
      });
    });

    it('findByDateRange rejects an inverted range', async () => {
      await expect(
        service.findByDateRange('2026-10-31', '2026-10-01', {
          page: 1,
          limit: 10,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('findByDateRange rejects an invalid date', async () => {
      await expect(
        service.findByDateRange('nope', '2026-10-01', { page: 1, limit: 10 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('findByDateRange requires both bounds', async () => {
      await expect(
        service.findByDateRange('', '2026-10-01', { page: 1, limit: 10 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
