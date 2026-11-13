import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WebhookLogService } from './services/webhook-log.service';
import { WebhookLogController } from './controllers/webhook-log.controller';
import { WebhookLog, WebhookLogSchema } from './schemas/webhook-log.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WebhookLog.name, schema: WebhookLogSchema },
    ]),
  ],
  controllers: [WebhookLogController],
  providers: [WebhookLogService],
  exports: [WebhookLogService],
})
export class WebhookLogModule {}
