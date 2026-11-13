import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ContactMessageService } from './services/contact-message.service';
import { ContactMessageController } from './controllers/contact-message.controller';
import {
  ContactMessage,
  ContactMessageSchema,
} from './schemas/contact-message.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ContactMessage.name, schema: ContactMessageSchema },
    ]),
  ],
  controllers: [ContactMessageController],
  providers: [ContactMessageService],
  exports: [ContactMessageService],
})
export class ContactMessageModule {}
