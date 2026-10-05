import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InvoiceItemService } from './services/invoice-item.service';
import { InvoiceItemController } from './controllers/invoice-item.controller';
import { InvoiceItem, InvoiceItemSchema } from './schemas/invoice-item.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: InvoiceItem.name, schema: InvoiceItemSchema },
    ]),
  ],
  controllers: [InvoiceItemController],
  providers: [InvoiceItemService],
  exports: [InvoiceItemService],
})
export class InvoiceItemModule {}
