import { Test, TestingModule } from '@nestjs/testing';
import { OtaConnectionController } from './ota-connection.controller';
import { OtaConnectionService } from '../services/ota-connection.service';

describe('OtaConnectionController', () => {
  let controller: OtaConnectionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OtaConnectionController],
      providers: [OtaConnectionService],
    }).compile();

    controller = module.get<OtaConnectionController>(OtaConnectionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
