import { Test, TestingModule } from '@nestjs/testing';
import { OtaConnectionService } from './ota-connection.service';

describe('OtaConnectionService', () => {
  let service: OtaConnectionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OtaConnectionService],
    }).compile();

    service = module.get<OtaConnectionService>(OtaConnectionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
