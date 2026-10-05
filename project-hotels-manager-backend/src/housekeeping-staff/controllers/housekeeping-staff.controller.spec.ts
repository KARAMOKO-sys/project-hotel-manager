import { Test, TestingModule } from '@nestjs/testing';
import { HousekeepingStaffController } from './housekeeping-staff.controller';
import { HousekeepingStaffService } from '../services/housekeeping-staff.service';

describe('HousekeepingStaffController', () => {
  let controller: HousekeepingStaffController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HousekeepingStaffController],
      providers: [HousekeepingStaffService],
    }).compile();

    controller = module.get<HousekeepingStaffController>(
      HousekeepingStaffController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
