import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReservationRoomService } from './services/reservation-room.service';
import { ReservationRoomController } from './controllers/reservation-room.controller';
import {
  ReservationRoom,
  ReservationRoomSchema,
} from './schemas/reservation-room.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ReservationRoom.name, schema: ReservationRoomSchema },
    ]),
  ],
  controllers: [ReservationRoomController],
  providers: [ReservationRoomService],
  exports: [ReservationRoomService],
})
export class ReservationRoomModule {}
