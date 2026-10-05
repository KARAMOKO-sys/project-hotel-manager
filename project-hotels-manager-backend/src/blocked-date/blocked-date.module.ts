import { Module } from '@nestjs/common';
import { BlockedDateService } from './services/blocked-date.service';
import { BlockedDateController } from './controllers/blocked-date.controller';

@Module({
  controllers: [BlockedDateController],
  providers: [BlockedDateService],
})
export class BlockedDateModule {}
