import { Test, TestingModule } from '@nestjs/testing';
import { RatePlanController } from './rate-plan.controller';
import { RatePlanService } from '../services/rate-plan.service';

describe('RatePlanController', () => {
  let controller: RatePlanController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RatePlanController],
      providers: [RatePlanService],
    }).compile();

    controller = module.get<RatePlanController>(RatePlanController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
