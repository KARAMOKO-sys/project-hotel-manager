import { Module } from '@nestjs/common';
import { AccountantService } from './services/accountant.service';
import { AccountantController } from './controllers/accountant.controller';

@Module({
  controllers: [AccountantController],
  providers: [AccountantService],
})
export class AccountantModule {}
