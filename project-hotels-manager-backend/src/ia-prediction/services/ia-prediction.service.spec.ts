import { Test, TestingModule } from '@nestjs/testing';
import { IaPredictionService } from './ia-prediction.service';

describe('IaPredictionService', () => {
  let service: IaPredictionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IaPredictionService],
    }).compile();

    service = module.get<IaPredictionService>(IaPredictionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
