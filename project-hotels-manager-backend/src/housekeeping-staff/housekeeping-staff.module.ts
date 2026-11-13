import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HousekeepingStaffService } from './services/housekeeping-staff.service';
import { HousekeepingStaffController } from './controllers/housekeeping-staff.controller';
import {
  HousekeepingStaff,
  HousekeepingStaffSchema,
} from './schemas/housekeeping-staff.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: HousekeepingStaff.name, schema: HousekeepingStaffSchema },
    ]),
  ],
  controllers: [HousekeepingStaffController],
  providers: [HousekeepingStaffService],
  exports: [HousekeepingStaffService],
})
export class HousekeepingStaffModule {}
