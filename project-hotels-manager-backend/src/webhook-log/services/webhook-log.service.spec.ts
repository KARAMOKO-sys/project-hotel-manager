/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { WebhookLogService } from './webhook-log.service';
import {
  WebhookLog,
  WebhookProvider,
  WebhookStatus,
} from '../schemas/webhook-log.entity';

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

describe('WebhookLogService', () => {
  let service: WebhookLogService;
  let model: any;
  let hook: any;

  beforeEach(async () => {
    hook = {
      _id: new Types.ObjectId(),
      provider: WebhookProvider.STRIPE,
      event_type: 'payment_intent.succeeded',
      event_id: 'evt_1',
      payload: { id: 'evt_1' },
      signature: 't=1,v1=abc',
      signature_verified: true,
      status: WebhookStatus.RECEIVED,
      attempts: 0,
      max_attempts: 5,
    };

    const ModelMock: any = function (data: any) {
      const doc = { ...data };
      doc.save = jest.fn().mockResolvedValue(doc);
      return doc;
    };
    ModelMock.findById = jest.fn().mockImplementation(() => execOf(hook));
    ModelMock.findOne = jest.fn().mockImplementation(() => execOf(hook));
    ModelMock.findOneAndUpdate = jest
      .fn()
      .mockImplementation((_f, update) => execOf(applyUpdate(hook, update)));
    ModelMock.findByIdAndUpdate = jest
      .fn()
      .mockImplementation((_id, update) => execOf(applyUpdate(hook, update)));
    ModelMock.find = jest.fn().mockReturnValue(chainOf([hook]));
    ModelMock.countDocuments = jest.fn().mockReturnValue(execOf(1));
    ModelMock.exists = jest.fn().mockResolvedValue(null);
    ModelMock.aggregate = jest.fn().mockReturnValue(execOf([]));
    model = ModelMock;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookLogService,
        { provide: getModelToken(WebhookLog.name), useValue: model },
      ],
    }).compile();

    service = module.get<WebhookLogService>(WebhookLogService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const dto = {
      provider: WebhookProvider.ORANGE_MONEY,
      event_type: 'payment.success',
      event_id: 'om_42',
      payload: { amount: 1000 },
    };

    it('logs a new event as received', async () => {
      const result = await service.create(dto);
      expect(result.status).toBe(WebhookStatus.RECEIVED);
      expect(result.is_duplicate).toBe(false);
      expect(result.received_at).toBeInstanceOf(Date);
    });

    it('flags a duplicate event as ignored', async () => {
      model.exists.mockResolvedValue({ _id: new Types.ObjectId() });
      const result = await service.create(dto);
      expect(result.status).toBe(WebhookStatus.IGNORED);
      expect(result.is_duplicate).toBe(true);
    });

    it('skips duplicate detection without event_id', async () => {
      await service.create({ ...dto, event_id: undefined });
      expect(model.exists).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('applies filters', async () => {
      await service.findAll({
        page: 1,
        limit: 10,
        provider: WebhookProvider.MTN_MOMO,
        status: WebhookStatus.FAILED,
        from: '2026-10-01',
      });
      const filter = model.find.mock.calls[0][0];
      expect(filter.provider).toBe(WebhookProvider.MTN_MOMO);
      expect(filter.status).toBe(WebhookStatus.FAILED);
      expect(filter.received_at.$gte).toEqual(new Date('2026-10-01'));
    });

    it('rejects an inverted period', async () => {
      await expect(
        service.findAll({
          page: 1,
          limit: 10,
          from: '2026-10-31',
          to: '2026-10-01',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  it('findByEvent looks up the original event', async () => {
    await service.findByEvent(WebhookProvider.STRIPE, 'evt_1');
    expect(model.findOne).toHaveBeenCalledWith({
      provider: WebhookProvider.STRIPE,
      event_id: 'evt_1',
      is_duplicate: { $ne: true },
    });
  });

  it('findByEvent throws 404 when missing', async () => {
    model.findOne.mockReturnValue(execOf(null));
    await expect(
      service.findByEvent(WebhookProvider.STRIPE, 'nope'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('findRetryable selects failed hooks under max attempts', async () => {
    await service.findRetryable();
    const filter = model.find.mock.calls[0][0];
    expect(filter.status).toBe(WebhookStatus.FAILED);
    expect(filter.$expr).toEqual({ $lt: ['$attempts', '$max_attempts'] });
  });

  it('setSignatureVerification updates the flag', async () => {
    const result = await service.setSignatureVerification(
      hook._id.toString(),
      false,
    );
    expect(result.signature_verified).toBe(false);
  });

  describe('markAsProcessing', () => {
    it('moves received → processing and counts the attempt', async () => {
      const result = await service.markAsProcessing(hook._id.toString());
      expect(result.status).toBe(WebhookStatus.PROCESSING);
      expect(result.attempts).toBe(1);
    });

    it('refuses an unverified signature', async () => {
      hook.signature_verified = false;
      await expect(
        service.markAsProcessing(hook._id.toString()),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('refuses when max attempts is reached', async () => {
      hook.attempts = 5;
      await expect(
        service.markAsProcessing(hook._id.toString()),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('refuses an already processed hook', async () => {
      hook.status = WebhookStatus.PROCESSED;
      await expect(
        service.markAsProcessing(hook._id.toString()),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws 404 for an unknown hook', async () => {
      model.findById.mockReturnValue(execOf(null));
      await expect(
        service.markAsProcessing(hook._id.toString()),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('markAsProcessed', () => {
    it('stores the result and related entity', async () => {
      hook.status = WebhookStatus.PROCESSING;
      hook.error_message = 'old';
      const paymentId = new Types.ObjectId().toString();
      const result = await service.markAsProcessed(hook._id.toString(), {
        result: { ok: true },
        related_entity_type: 'Payment',
        related_entity_id: paymentId,
      });
      expect(result.status).toBe(WebhookStatus.PROCESSED);
      expect(result.result).toEqual({ ok: true });
      expect(result.related_entity_id?.toString()).toBe(paymentId);
      expect(result.error_message).toBeUndefined();
    });

    it('rejects a failed hook', async () => {
      hook.status = WebhookStatus.FAILED;
      await expect(
        service.markAsProcessed(hook._id.toString()),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects on concurrent modification', async () => {
      model.findOneAndUpdate.mockReturnValue(execOf(null));
      await expect(
        service.markAsProcessed(hook._id.toString()),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('markAsFailed', () => {
    it('stores the error', async () => {
      hook.status = WebhookStatus.PROCESSING;
      const result = await service.markAsFailed(hook._id.toString(), 'boom');
      expect(result.status).toBe(WebhookStatus.FAILED);
      expect(result.error_message).toBe('boom');
    });

    it('rejects an already processed hook', async () => {
      hook.status = WebhookStatus.PROCESSED;
      await expect(
        service.markAsFailed(hook._id.toString(), 'x'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('markAsIgnored', () => {
    it('ignores a received hook with a reason', async () => {
      const result = await service.markAsIgnored(
        hook._id.toString(),
        'Événement non géré',
      );
      expect(result.status).toBe(WebhookStatus.IGNORED);
      expect(result.notes).toBe('Événement non géré');
    });

    it('rejects a processed hook', async () => {
      hook.status = WebhookStatus.PROCESSED;
      await expect(
        service.markAsIgnored(hook._id.toString()),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('retry', () => {
    it('puts a failed hook back to received', async () => {
      hook.status = WebhookStatus.FAILED;
      hook.attempts = 2;
      const result = await service.retry(hook._id.toString());
      expect(result.status).toBe(WebhookStatus.RECEIVED);
    });

    it('rejects when max attempts is reached', async () => {
      hook.status = WebhookStatus.FAILED;
      hook.attempts = 5;
      await expect(service.retry(hook._id.toString())).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('rejects a non failed hook', async () => {
      await expect(service.retry(hook._id.toString())).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  it('getStats aggregates by provider and status', async () => {
    model.aggregate.mockReturnValue(
      execOf([
        { _id: { provider: 'stripe', status: 'processed' }, count: 9 },
        { _id: { provider: 'stripe', status: 'failed' }, count: 1 },
        { _id: { provider: 'booking', status: 'ignored' }, count: 2 },
      ]),
    );
    const stats = await service.getStats(undefined, '2026-10-01');
    expect(stats.total).toBe(12);
    expect(stats.by_provider.stripe).toEqual({ processed: 9, failed: 1 });
    expect(stats.success_rate).toBe(90);
    const match = model.aggregate.mock.calls[0][0][0].$match;
    expect(match.received_at.$gte).toEqual(new Date('2026-10-01'));
  });
});
