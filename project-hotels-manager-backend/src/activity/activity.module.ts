import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RecordsModule } from '../records/records.module';
import { ActivityController } from './controllers/activity.controller';
import { ActivityService } from './services/activity.service';
import { ActivityTrackingListener } from './services/activity-tracking.listener';
import { ActivityDueScheduler } from './services/activity-due.scheduler';
import {
  RecordMessage,
  RecordMessageSchema,
} from './schemas/record-message.entity';
import {
  RecordFollower,
  RecordFollowerSchema,
} from './schemas/record-follower.entity';
import {
  RecordActivity,
  RecordActivitySchema,
} from './schemas/record-activity.entity';

/** Application « Discussion et activités » (fil de discussion des fiches). */
@Module({
  imports: [
    RecordsModule,
    MongooseModule.forFeature([
      { name: RecordMessage.name, schema: RecordMessageSchema },
      { name: RecordFollower.name, schema: RecordFollowerSchema },
      { name: RecordActivity.name, schema: RecordActivitySchema },
    ]),
  ],
  controllers: [ActivityController],
  providers: [ActivityService, ActivityTrackingListener, ActivityDueScheduler],
  exports: [ActivityService],
})
export class ActivityModule {}
