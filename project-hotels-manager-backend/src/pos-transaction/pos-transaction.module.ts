import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PosTransactionService } from './services/pos-transaction.service';
import { PosTransactionController } from './controllers/pos-transaction.controller';
import {
  PosTransaction,
  PosTransactionSchema,
} from './schemas/pos-transaction.entity';
import { PosItemModule } from '../pos-item/pos-item.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PosTransaction.name, schema: PosTransactionSchema },
    ]),
    PosItemModule,
  ],
  controllers: [PosTransactionController],
  providers: [PosTransactionService],
  exports: [PosTransactionService],
})
export class PosTransactionModule {}
