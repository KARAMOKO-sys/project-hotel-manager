import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GuestRequestService } from './services/guest-request.service';
import { GuestRequestController } from './controllers/guest-request.controller';
import {
  GuestRequest,
  GuestRequestSchema,
} from './schemas/guest-request.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GuestRequest.name, schema: GuestRequestSchema },
    ]),
  ],
  controllers: [GuestRequestController],
  providers: [GuestRequestService],
  exports: [GuestRequestService],
})
export class GuestRequestModule {}
