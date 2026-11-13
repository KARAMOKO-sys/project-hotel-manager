import { Test, TestingModule } from '@nestjs/testing';
import { NotificationLogController } from './notification-log.controller';
import { NotificationLogService } from '../services/notification-log.service';

describe('NotificationLogController', () => {
  let controller: NotificationLogController;
  let service: Record<string, jest.Mock>;
  const id = '507f1f77bcf86cd799439011';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationLogController],
      providers: [
        {
          provide: NotificationLogService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            findByRecipient: jest.fn(),
            findUnread: jest.fn(),
            findPendingRetries: jest.fn(),
            getStats: jest.fn(),
            markAsSent: jest.fn(),
            markAsDelivered: jest.fn(),
            markAsRead: jest.fn(),
            markAsFailed: jest.fn(),
            retry: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<NotificationLogController>(
      NotificationLogController,
    );
    service = module.get(NotificationLogService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates status transitions', async () => {
    await controller.markAsSent({ id }, { provider_message_id: 'X' });
    await controller.markAsDelivered({ id });
    await controller.markAsRead({ id });
    await controller.markAsFailed({ id }, { error_message: 'boom' });
    await controller.retry({ id });
    expect(service.markAsSent).toHaveBeenCalledWith(id, {
      provider_message_id: 'X',
    });
    expect(service.markAsDelivered).toHaveBeenCalledWith(id);
    expect(service.markAsRead).toHaveBeenCalledWith(id);
    expect(service.markAsFailed).toHaveBeenCalledWith(id, 'boom');
    expect(service.retry).toHaveBeenCalledWith(id);
  });

  it('delegates queries', async () => {
    await controller.findByRecipient(id, { page: 1, limit: 10 });
    await controller.findUnread(id);
    await controller.findPendingRetries(5);
    await controller.getStats({ from: '2026-10-01' });
    expect(service.findByRecipient).toHaveBeenCalledWith(id, {
      page: 1,
      limit: 10,
    });
    expect(service.findUnread).toHaveBeenCalledWith(id);
    expect(service.findPendingRetries).toHaveBeenCalledWith(5);
    expect(service.getStats).toHaveBeenCalledWith({ from: '2026-10-01' });
  });
});
