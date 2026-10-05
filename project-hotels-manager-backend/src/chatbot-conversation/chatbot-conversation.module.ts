import { Module } from '@nestjs/common';
import { ChatbotConversationService } from './services/chatbot-conversation.service';
import { ChatbotConversationController } from './controllers/chatbot-conversation.controller';

@Module({
  controllers: [ChatbotConversationController],
  providers: [ChatbotConversationService],
})
export class ChatbotConversationModule {}
