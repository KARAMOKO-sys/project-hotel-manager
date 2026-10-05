import { Injectable } from '@nestjs/common';
import { CreateChatbotConversationDto } from '../dto/create-chatbot-conversation.dto';
import { UpdateChatbotConversationDto } from '../dto/update-chatbot-conversation.dto';

@Injectable()
export class ChatbotConversationService {
  create(createChatbotConversationDto: CreateChatbotConversationDto) {
    return 'This action adds a new chatbotConversation';
  }

  findAll() {
    return `This action returns all chatbotConversation`;
  }

  findOne(id: number) {
    return `This action returns a #${id} chatbotConversation`;
  }

  update(
    id: number,
    updateChatbotConversationDto: UpdateChatbotConversationDto,
  ) {
    return `This action updates a #${id} chatbotConversation`;
  }

  remove(id: number) {
    return `This action removes a #${id} chatbotConversation`;
  }
}
