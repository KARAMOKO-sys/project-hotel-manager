import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  LoyaltyProgram,
  LoyaltyProgramSchema,
} from './schemas/loyalty-program.entity';
import {
  LoyaltyAccount,
  LoyaltyAccountSchema,
} from './schemas/loyalty-account.entity';
import {
  LoyaltyTransaction,
  LoyaltyTransactionSchema,
} from './schemas/loyalty-transaction.entity';
import { LoyaltyProgramService } from './services/loyalty-program.service';
import { LoyaltyAccountService } from './services/loyalty-account.service';
import { LoyaltyListener } from './services/loyalty.listener';
import { LoyaltyProgramController } from './controllers/loyalty-program.controller';
import { LoyaltyAccountController } from './controllers/loyalty-account.controller';

/**
 * Application Fidélité (`loyalty`) : programmes, comptes, grand livre,
 * gains automatiques (séjours, POS), utilisation, expiration.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: LoyaltyProgram.name, schema: LoyaltyProgramSchema },
      { name: LoyaltyAccount.name, schema: LoyaltyAccountSchema },
      { name: LoyaltyTransaction.name, schema: LoyaltyTransactionSchema },
    ]),
  ],
  controllers: [LoyaltyProgramController, LoyaltyAccountController],
  providers: [LoyaltyProgramService, LoyaltyAccountService, LoyaltyListener],
  exports: [LoyaltyProgramService, LoyaltyAccountService],
})
export class LoyaltyModule {}
