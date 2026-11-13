/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { NotificationLogService } from './notification-log.service';
import {
  NotificationLog,
  NotificationStatus,
} from '../schemas/notification-log.entity';
import { NotificationChannel } from '../../base-entities/enums/notification-channel.enum';

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

/** Applique grossièrement un update Mongo ($inc/$unset/champs) sur un objet. */
const applyUpdate = (doc: any, update: any) => {
  const next = { ...doc };
  for (const [key, value] of Object.entries(update)) {
    if (key === '$inc') {
      for (const [f, v] of Object.entries(value as object)) {
        next[f] = (next[f] ?? 0) + v;
      }
    } else if (key === '$unset') {
      for (const f of Object.keys(value as object)) delete next[f];
    } else {
      next[key] = value;
    }
  }
  return next;
};

describe('NotificationLogService', () => {
  let service: NotificationLogService;
  let model: any;
  let log: any;
  const recipientId = new Types.ObjectId();

  beforeEach(async () => {
    log = {
      _id: new Types.ObjectId(),
      recipient_id: recipientId,
      channel: NotificationChannel.EMAIL,
      status: NotificationStatus.QUEUED,
      retry_count: 0,
      max_retries: 3,
    };

    const ModelMock: any = function (data: any) {
      const doc = { ...data };
      doc.save = jest.fn().mockResolvedValue(doc);
      return doc;
    };
    ModelMock.findById = jest.fn().mockImplementation(() => execOf(log));
    ModelMock.findOneAndUpdate = jest
      .fn()
      .mockImplementation((_f, update) => execOf(applyUpdate(log, update)));
    ModelMock.findByIdAndUpdate = jest
      .fn()
      .mockImplementation((_id, update) => execOf(applyUpdate(log, update)));
    ModelMock.find = jest.fn().mockReturnValue(chainOf([log]));
    ModelMock.countDocuments = jest.fn().mockReturnValue(execOf(1));
    ModelMock.aggregate = jest.fn().mockReturnValue(execOf([]));
    model = ModelMock;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationLogService,
        { provide: getModelToken(NotificationLog.name), useValue: model },
      ],
    }).compile();

    service = module.get<NotificationLogService>(NotificationLogService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('queues a notification', async () => {
      const result = await service.create({
        recipient_id: recipientId.toString(),
        channel: NotificationChannel.SMS,
        body: 'Bonjour',
      });
      expect(result.status).toBe(NotificationStatus.QUEUED);
      expect(result.retry_count).toBe(0);
    });

    it('requires a recipient', async () => {
      await expect(
        service.create({ channel: NotificationChannel.EMAIL }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  it('findAll applies filters', async () => {
    await service.findAll({
      page: 1,
      limit: 10,
      channel: NotificationChannel.PUSH,
      status: NotificationStatus.FAILED,
    });
    const filter = model.find.mock.calls[0][0];
    expect(filter.channel).toBe(NotificationChannel.PUSH);
    expect(filter.status).toBe(NotificationStatus.FAILED);
  });

  it('findByRecipient filters on recipient_id', async () => {
    const result = await service.findByRecipient(recipientId.toString(), {
      page: 1,
      limit: 10,
    });
    expect(model.find.mock.calls[0][0].recipient_id).toEqual(recipientId);
    expect(result.data).toEqual([log]);
  });

  it('findUnread targets in-app sent/delivered notifications', async () => {
    await service.findUnread(recipientId.toString());
    const filter = model.find.mock.calls[0][0];
    expect(filter.channel).toBe(NotificationChannel.IN_APP);
    expect(filter.status.$in).toEqual([
      NotificationStatus.SENT,
      NotificationStatus.DELIVERED,
    ]);
  });

  describe('markAsSent', () => {
    it('moves queued → sent with provider id', async () => {
      const result = await service.markAsSent(log._id.toString(), {
        provider_message_id: 'SG-1',
      });
      expect(result.status).toBe(NotificationStatus.SENT);
      expect(result.provider_message_id).toBe('SG-1');
      expect(result.sent_at).toBeInstanceOf(Date);
    });

    it('rejects when not queued', async () => {
      log.status = NotificationStatus.DELIVERED;
      await expect(
        service.markAsSent(log._id.toString()),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws 404 for unknown notification', async () => {
      model.findById.mockReturnValue(execOf(null));
      await expect(
        service.markAsSent(log._id.toString()),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects on concurrent modification', async () => {
      model.findOneAndUpdate.mockReturnValue(execOf(null));
      await expect(
        service.markAsSent(log._id.toString()),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('markAsDelivered', () => {
    it('moves sent → delivered', async () => {
      log.status = NotificationStatus.SENT;
      const result = await service.markAsDelivered(log._id.toString());
      expect(result.status).toBe(NotificationStatus.DELIVERED);
    });

    it('rejects from queued', async () => {
      await expect(
        service.markAsDelivered(log._id.toString()),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('markAsRead', () => {
    it('moves delivered → read', async () => {
      log.status = NotificationStatus.DELIVERED;
      const result = await service.markAsRead(log._id.toString());
      expect(result.status).toBe(NotificationStatus.READ);
    });

    it('is idempotent when already read', async () => {
      log.status = NotificationStatus.READ;
      await service.markAsRead(log._id.toString());
      expect(model.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('rejects a failed notification', async () => {
      log.status = NotificationStatus.FAILED;
      await expect(
        service.markAsRead(log._id.toString()),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('markAsFailed', () => {
    it('records the error and schedules a retry', async () => {
      const before = Date.now();
      const result = await service.markAsFailed(log._id.toString(), 'SMTP');
      expect(result.status).toBe(NotificationStatus.FAILED);
      expect(result.error_message).toBe('SMTP');
      expect(result.next_retry_at!.getTime()).toBeGreaterThanOrEqual(
        before + 5 * 60 * 1000,
      );
    });

    it('does not schedule a retry once max retries is reached', async () => {
      log.retry_count = 3;
      log.next_retry_at = new Date();
      const result = await service.markAsFailed(log._id.toString(), 'SMTP');
      expect(result.next_retry_at).toBeUndefined();
    });

    it('rejects an already failed notification', async () => {
      log.status = NotificationStatus.FAILED;
      await expect(
        service.markAsFailed(log._id.toString(), 'x'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('retry', () => {
    it('requeues a failed notification and increments retry_count', async () => {
      log.status = NotificationStatus.FAILED;
      log.retry_count = 1;
      const result = await service.retry(log._id.toString());
      expect(result.status).toBe(NotificationStatus.QUEUED);
      expect(result.retry_count).toBe(2);
    });

    it('rejects when max retries is reached', async () => {
      log.status = NotificationStatus.FAILED;
      log.retry_count = 3;
      await expect(service.retry(log._id.toString())).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('rejects a non failed notification', async () => {
      await expect(service.retry(log._id.toString())).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  it('findPendingRetries selects due failed notifications', async () => {
    await service.findPendingRetries(10);
    const filter = model.find.mock.calls[0][0];
    expect(filter.status).toBe(NotificationStatus.FAILED);
    expect(filter.$expr).toEqual({ $lt: ['$retry_count', '$max_retries'] });
  });

  describe('getStats', () => {
    it('computes totals and rates', async () => {
      model.aggregate.mockReturnValue(
        execOf([
          { _id: { channel: 'email', status: 'delivered' }, count: 6 },
          { _id: { channel: 'email', status: 'failed' }, count: 2 },
          { _id: { channel: 'sms', status: 'read' }, count: 2 },
        ]),
      );
      const stats = await service.getStats({
        from: '2026-10-01',
        to: '2026-10-31',
      });
      expect(stats.total).toBe(10);
      expect(stats.by_status).toEqual({ delivered: 6, failed: 2, read: 2 });
      expect(stats.by_channel.email).toEqual({ delivered: 6, failed: 2 });
      expect(stats.delivery_rate).toBe(80);
      expect(stats.failure_rate).toBe(20);
    });

    it('returns zero rates without data', async () => {
      const stats = await service.getStats();
      expect(stats).toEqual({
        total: 0,
        by_status: {},
        by_channel: {},
        delivery_rate: 0,
        failure_rate: 0,
      });
    });

    it('rejects an inverted period', async () => {
      await expect(
        service.getStats({ from: '2026-10-31', to: '2026-10-01' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
