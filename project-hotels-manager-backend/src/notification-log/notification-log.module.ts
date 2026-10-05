import { Module } from '@nestjs/common';
import { NotificationLogService } from './services/notification-log.service';
import { NotificationLogController } from './controllers/notification-log.controller';

@Module({
  controllers: [NotificationLogController],
  providers: [NotificationLogService],
})
export class NotificationLogModule {}
