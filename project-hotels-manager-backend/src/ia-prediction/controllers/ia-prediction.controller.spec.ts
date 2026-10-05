import { Test, TestingModule } from '@nestjs/testing';
import { IaPredictionController } from './ia-prediction.controller';
import { IaPredictionService } from '../services/ia-prediction.service';

describe('IaPredictionController', () => {
  let controller: IaPredictionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IaPredictionController],
      providers: [IaPredictionService],
    }).compile();

    controller = module.get<IaPredictionController>(IaPredictionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
