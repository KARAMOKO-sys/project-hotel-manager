import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RoomTypeService } from './services/room-type.service';
import { RoomTypeController } from './controllers/room-type.controller';
import { RoomType, RoomTypeSchema } from './schemas/room-type.entity';
import { Room, RoomSchema } from '../room/schemas/room.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RoomType.name, schema: RoomTypeSchema },
      { name: Room.name, schema: RoomSchema },
    ]),
  ],
  controllers: [RoomTypeController],
  providers: [RoomTypeService],
  exports: [RoomTypeService],
})
export class RoomTypeModule {}
