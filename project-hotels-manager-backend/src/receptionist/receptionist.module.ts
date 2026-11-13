import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReceptionistService } from './services/receptionist.service';
import { ReceptionistController } from './controllers/receptionist.controller';
import {
  Receptionist,
  ReceptionistSchema,
} from './schemas/receptionist.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Receptionist.name, schema: ReceptionistSchema },
    ]),
  ],
  controllers: [ReceptionistController],
  providers: [ReceptionistService],
  exports: [ReceptionistService],
})
export class ReceptionistModule {}
