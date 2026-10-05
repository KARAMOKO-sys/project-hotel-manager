import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HousekeepingService } from './services/housekeeping.service';
import { HousekeepingController } from './controllers/housekeeping.controller';
import {
  Housekeeping,
  HousekeepingSchema,
} from './schemas/housekeeping.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Housekeeping.name, schema: HousekeepingSchema },
    ]),
  ],
  controllers: [HousekeepingController],
  providers: [HousekeepingService],
  exports: [HousekeepingService],
})
export class HousekeepingModule {}
