import { Module } from '@nestjs/common';
import { OtaConnectionService } from './services/ota-connection.service';
import { OtaConnectionController } from './controllers/ota-connection.controller';

@Module({
  controllers: [OtaConnectionController],
  providers: [OtaConnectionService],
})
export class OtaConnectionModule {}
