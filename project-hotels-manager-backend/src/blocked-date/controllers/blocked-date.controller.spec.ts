import { Test, TestingModule } from '@nestjs/testing';
import { BlockedDateController } from './blocked-date.controller';
import { BlockedDateService } from '../services/blocked-date.service';

describe('BlockedDateController', () => {
  let controller: BlockedDateController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BlockedDateController],
      providers: [BlockedDateService],
    }).compile();

    controller = module.get<BlockedDateController>(BlockedDateController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
