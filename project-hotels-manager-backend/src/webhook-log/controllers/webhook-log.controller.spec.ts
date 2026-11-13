import { Test, TestingModule } from '@nestjs/testing';
import { WebhookLogController } from './webhook-log.controller';
import { WebhookLogService } from '../services/webhook-log.service';
import { WebhookProvider } from '../schemas/webhook-log.entity';

describe('WebhookLogController', () => {
  let controller: WebhookLogController;
  let service: Record<string, jest.Mock>;
  const id = '507f1f77bcf86cd799439011';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhookLogController],
      providers: [
        {
          provide: WebhookLogService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            findByEvent: jest.fn(),
            findRetryable: jest.fn(),
            getStats: jest.fn(),
            setSignatureVerification: jest.fn(),
            markAsProcessing: jest.fn(),
            markAsProcessed: jest.fn(),
            markAsFailed: jest.fn(),
            markAsIgnored: jest.fn(),
            retry: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<WebhookLogController>(WebhookLogController);
    service = module.get(WebhookLogService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates processing transitions', async () => {
    await controller.setSignatureVerification({ id }, { verified: true });
    await controller.markAsProcessing({ id });
    await controller.markAsProcessed({ id }, { result: { ok: 1 } });
    await controller.markAsFailed({ id }, { error_message: 'boom' });
    await controller.markAsIgnored({ id }, { reason: 'n/a' });
    await controller.retry({ id });
    expect(service.setSignatureVerification).toHaveBeenCalledWith(id, true);
    expect(service.markAsProcessing).toHaveBeenCalledWith(id);
    expect(service.markAsProcessed).toHaveBeenCalledWith(id, {
      result: { ok: 1 },
    });
    expect(service.markAsFailed).toHaveBeenCalledWith(id, 'boom');
    expect(service.markAsIgnored).toHaveBeenCalledWith(id, 'n/a');
    expect(service.retry).toHaveBeenCalledWith(id);
  });

  it('delegates lookups and stats', async () => {
    await controller.findByEvent(WebhookProvider.STRIPE, 'evt_1');
    await controller.getStats(WebhookProvider.WAVE, '2026-10-01', undefined);
    await controller.findRetryable(20);
    expect(service.findByEvent).toHaveBeenCalledWith(
      WebhookProvider.STRIPE,
      'evt_1',
    );
    expect(service.getStats).toHaveBeenCalledWith(
      WebhookProvider.WAVE,
      '2026-10-01',
      undefined,
    );
    expect(service.findRetryable).toHaveBeenCalledWith(20);
  });
});
