import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationLogService } from './services/notification-log.service';
import { NotificationLogController } from './controllers/notification-log.controller';
import {
  NotificationLog,
  NotificationLogSchema,
} from './schemas/notification-log.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: NotificationLog.name, schema: NotificationLogSchema },
    ]),
  ],
  controllers: [NotificationLogController],
  providers: [NotificationLogService],
  exports: [NotificationLogService],
})
export class NotificationLogModule {}
