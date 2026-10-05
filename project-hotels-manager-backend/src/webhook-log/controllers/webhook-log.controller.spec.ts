import { Test, TestingModule } from '@nestjs/testing';
import { WebhookLogController } from './webhook-log.controller';
import { WebhookLogService } from '../services/webhook-log.service';

describe('WebhookLogController', () => {
  let controller: WebhookLogController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhookLogController],
      providers: [WebhookLogService],
    }).compile();

    controller = module.get<WebhookLogController>(WebhookLogController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
