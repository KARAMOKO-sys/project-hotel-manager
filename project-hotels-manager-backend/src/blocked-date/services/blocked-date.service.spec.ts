import { Test, TestingModule } from '@nestjs/testing';
import { BlockedDateService } from './blocked-date.service';

describe('BlockedDateService', () => {
  let service: BlockedDateService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BlockedDateService],
    }).compile();

    service = module.get<BlockedDateService>(BlockedDateService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
