import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BlockedDateService } from './services/blocked-date.service';
import { BlockedDateController } from './controllers/blocked-date.controller';
import { BlockedDate, BlockedDateSchema } from './schemas/blocked-date.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BlockedDate.name, schema: BlockedDateSchema },
    ]),
  ],
  controllers: [BlockedDateController],
  providers: [BlockedDateService],
  exports: [BlockedDateService],
})
export class BlockedDateModule {}
