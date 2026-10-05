import { Test, TestingModule } from '@nestjs/testing';
import { AccountantController } from './accountant.controller';
import { AccountantService } from '../services/accountant.service';

describe('AccountantController', () => {
  let controller: AccountantController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AccountantController],
      providers: [AccountantService],
    }).compile();

    controller = module.get<AccountantController>(AccountantController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
