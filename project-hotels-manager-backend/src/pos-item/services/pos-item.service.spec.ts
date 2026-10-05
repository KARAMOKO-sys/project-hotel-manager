import { Test, TestingModule } from '@nestjs/testing';
import { PosItemService } from './pos-item.service';

describe('PosItemService', () => {
  let service: PosItemService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PosItemService],
    }).compile();

    service = module.get<PosItemService>(PosItemService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
