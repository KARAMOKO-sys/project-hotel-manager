import { Module } from '@nestjs/common';
import { WaitlistService } from './services/waitlist.service';
import { WaitlistController } from './controllers/waitlist.controller';

@Module({
  controllers: [WaitlistController],
  providers: [WaitlistService],
})
export class WaitlistModule {}
