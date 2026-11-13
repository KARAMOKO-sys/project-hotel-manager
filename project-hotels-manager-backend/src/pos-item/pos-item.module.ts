import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PosItemService } from './services/pos-item.service';
import { PosItemController } from './controllers/pos-item.controller';
import { PosItem, PosItemSchema } from './schemas/pos-item.entity';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: PosItem.name, schema: PosItemSchema }]),
  ],
  controllers: [PosItemController],
  providers: [PosItemService],
  exports: [PosItemService],
})
export class PosItemModule {}
