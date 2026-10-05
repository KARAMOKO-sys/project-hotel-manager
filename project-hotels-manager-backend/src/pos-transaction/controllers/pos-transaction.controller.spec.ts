import { Test, TestingModule } from '@nestjs/testing';
import { PosTransactionController } from './pos-transaction.controller';
import { PosTransactionService } from '../services/pos-transaction.service';

describe('PosTransactionController', () => {
  let controller: PosTransactionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PosTransactionController],
      providers: [PosTransactionService],
    }).compile();

    controller = module.get<PosTransactionController>(PosTransactionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
