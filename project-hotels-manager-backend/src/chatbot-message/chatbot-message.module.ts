import { Module } from '@nestjs/common';
import { ChatbotMessageService } from './services/chatbot-message.service';
import { ChatbotMessageController } from './controllers/chatbot-message.controller';

@Module({
  controllers: [ChatbotMessageController],
  providers: [ChatbotMessageService],
})
export class ChatbotMessageModule {}
