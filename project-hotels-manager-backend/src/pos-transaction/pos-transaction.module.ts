import { Module } from '@nestjs/common';
import { PosTransactionService } from './services/pos-transaction.service';
import { PosTransactionController } from './controllers/pos-transaction.controller';

@Module({
  controllers: [PosTransactionController],
  providers: [PosTransactionService],
})
export class PosTransactionModule {}
