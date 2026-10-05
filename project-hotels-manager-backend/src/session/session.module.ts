import { Module } from '@nestjs/common';
import { SessionService } from './services/session.service';
import { SessionController } from './controllers/session.controller';

@Module({
  controllers: [SessionController],
  providers: [SessionService],
})
export class SessionModule {}
