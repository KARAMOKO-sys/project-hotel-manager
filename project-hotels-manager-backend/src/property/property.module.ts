import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PropertyService } from './services/property.service';
import { PropertyController } from './controllers/property.controller';
import { Property, PropertySchema } from './schemas/property.entity';
import { Room, RoomSchema } from '../room/schemas/room.entity';
import {
  RoomType,
  RoomTypeSchema,
} from '../room-type/schemas/room-type.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Property.name, schema: PropertySchema },
      { name: Room.name, schema: RoomSchema },
      { name: RoomType.name, schema: RoomTypeSchema },
    ]),
  ],
  controllers: [PropertyController],
  providers: [PropertyService],
  exports: [PropertyService],
})
export class PropertyModule {}
