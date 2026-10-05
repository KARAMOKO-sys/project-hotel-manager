import { Module } from '@nestjs/common';
import { HousekeepingStaffService } from './services/housekeeping-staff.service';
import { HousekeepingStaffController } from './controllers/housekeeping-staff.controller';

@Module({
  controllers: [HousekeepingStaffController],
  providers: [HousekeepingStaffService],
})
export class HousekeepingStaffModule {}
