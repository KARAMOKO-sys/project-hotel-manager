import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OtaConnectionService } from './services/ota-connection.service';
import { OtaConnectionController } from './controllers/ota-connection.controller';
import {
  OtaConnection,
  OtaConnectionSchema,
} from './schemas/ota-connection.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: OtaConnection.name, schema: OtaConnectionSchema },
    ]),
  ],
  controllers: [OtaConnectionController],
  providers: [OtaConnectionService],
  exports: [OtaConnectionService],
})
export class OtaConnectionModule {}
