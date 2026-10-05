import { Injectable } from '@nestjs/common';
import { CreateHousekeepingStaffDto } from '../dto/create-housekeeping-staff.dto';
import { UpdateHousekeepingStaffDto } from '../dto/update-housekeeping-staff.dto';

@Injectable()
export class HousekeepingStaffService {
  create(createHousekeepingStaffDto: CreateHousekeepingStaffDto) {
    return 'This action adds a new housekeepingStaff';
  }

  findAll() {
    return `This action returns all housekeepingStaff`;
  }

  findOne(id: number) {
    return `This action returns a #${id} housekeepingStaff`;
  }

  update(id: number, updateHousekeepingStaffDto: UpdateHousekeepingStaffDto) {
    return `This action updates a #${id} housekeepingStaff`;
  }

  remove(id: number) {
    return `This action removes a #${id} housekeepingStaff`;
  }
}
