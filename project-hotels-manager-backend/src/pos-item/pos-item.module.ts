import { Module } from '@nestjs/common';
import { PosItemService } from './services/pos-item.service';
import { PosItemController } from './controllers/pos-item.controller';

@Module({
  controllers: [PosItemController],
  providers: [PosItemService],
})
export class PosItemModule {}
