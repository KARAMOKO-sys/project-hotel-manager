import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatbotConversationService } from './services/chatbot-conversation.service';
import { ChatbotConversationController } from './controllers/chatbot-conversation.controller';
import {
  ChatbotConversation,
  ChatbotConversationSchema,
} from './schemas/chatbot-conversation.entity';
import {
  ChatbotMessage,
  ChatbotMessageSchema,
} from '../chatbot-message/schemas/chatbot-message.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ChatbotConversation.name, schema: ChatbotConversationSchema },
      // Le flux `handleGuestMessage` persiste directement les messages.
      { name: ChatbotMessage.name, schema: ChatbotMessageSchema },
    ]),
  ],
  controllers: [ChatbotConversationController],
  providers: [ChatbotConversationService],
  exports: [ChatbotConversationService],
})
export class ChatbotConversationModule {}
