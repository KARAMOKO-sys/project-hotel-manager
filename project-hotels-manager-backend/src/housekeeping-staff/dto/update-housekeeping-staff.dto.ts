import { PartialType } from '@nestjs/mapped-types';
import { CreateHousekeepingStaffDto } from './create-housekeeping-staff.dto';

export class UpdateHousekeepingStaffDto extends PartialType(
  CreateHousekeepingStaffDto,
) {}
