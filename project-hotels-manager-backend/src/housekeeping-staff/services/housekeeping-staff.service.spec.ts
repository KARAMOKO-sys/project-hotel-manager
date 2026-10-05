import { Test, TestingModule } from '@nestjs/testing';
import { HousekeepingStaffService } from './housekeeping-staff.service';

describe('HousekeepingStaffService', () => {
  let service: HousekeepingStaffService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HousekeepingStaffService],
    }).compile();

    service = module.get<HousekeepingStaffService>(HousekeepingStaffService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
