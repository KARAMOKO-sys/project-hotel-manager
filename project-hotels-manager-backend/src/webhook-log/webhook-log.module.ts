import { Module } from '@nestjs/common';
import { WebhookLogService } from './services/webhook-log.service';
import { WebhookLogController } from './controllers/webhook-log.controller';

@Module({
  controllers: [WebhookLogController],
  providers: [WebhookLogService],
})
export class WebhookLogModule {}
