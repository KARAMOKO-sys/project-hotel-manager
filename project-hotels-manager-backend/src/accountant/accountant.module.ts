import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AccountantService } from './services/accountant.service';
import { AccountantController } from './controllers/accountant.controller';
import { Accountant, AccountantSchema } from './schemas/accountant.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Accountant.name, schema: AccountantSchema },
    ]),
  ],
  controllers: [AccountantController],
  providers: [AccountantService],
  exports: [AccountantService],
})
export class AccountantModule {}
