import { Module } from '@nestjs/common';
import { OwnersService } from './services/owners.service';
import { OwnersController } from './controllers/owners.controller';

@Module({
  controllers: [OwnersController],
  providers: [OwnersService],
})
export class OwnersModule {}
