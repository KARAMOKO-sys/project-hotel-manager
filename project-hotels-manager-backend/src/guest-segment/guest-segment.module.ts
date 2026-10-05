import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GuestSegmentService } from './services/guest-segment.service';
import { GuestSegmentController } from './controllers/guest-segment.controller';
import {
  GuestSegment,
  GuestSegmentSchema,
} from './schemas/guest-segment.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GuestSegment.name, schema: GuestSegmentSchema },
    ]),
  ],
  controllers: [GuestSegmentController],
  providers: [GuestSegmentService],
  exports: [GuestSegmentService],
})
export class GuestSegmentModule {}
