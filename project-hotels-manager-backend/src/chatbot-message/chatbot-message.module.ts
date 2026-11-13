import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatbotMessageService } from './services/chatbot-message.service';
import { ChatbotMessageController } from './controllers/chatbot-message.controller';
import {
  ChatbotMessage,
  ChatbotMessageSchema,
} from './schemas/chatbot-message.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ChatbotMessage.name, schema: ChatbotMessageSchema },
    ]),
  ],
  controllers: [ChatbotMessageController],
  providers: [ChatbotMessageService],
  exports: [ChatbotMessageService],
})
export class ChatbotMessageModule {}
