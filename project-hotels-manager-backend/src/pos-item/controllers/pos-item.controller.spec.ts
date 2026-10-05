import { Test, TestingModule } from '@nestjs/testing';
import { PosItemController } from './pos-item.controller';
import { PosItemService } from '../services/pos-item.service';

describe('PosItemController', () => {
  let controller: PosItemController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PosItemController],
      providers: [PosItemService],
    }).compile();

    controller = module.get<PosItemController>(PosItemController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
