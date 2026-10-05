import { Module } from '@nestjs/common';
import { ReceptionistService } from './services/receptionist.service';
import { ReceptionistController } from './controllers/receptionist.controller';

@Module({
  controllers: [ReceptionistController],
  providers: [ReceptionistService],
})
export class ReceptionistModule {}
