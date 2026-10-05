import { Injectable } from '@nestjs/common';
import { CreateChatbotMessageDto } from '../dto/create-chatbot-message.dto';
import { UpdateChatbotMessageDto } from '../dto/update-chatbot-message.dto';

@Injectable()
export class ChatbotMessageService {
  create(createChatbotMessageDto: CreateChatbotMessageDto) {
    return 'This action adds a new chatbotMessage';
  }

  findAll() {
    return `This action returns all chatbotMessage`;
  }

  findOne(id: number) {
    return `This action returns a #${id} chatbotMessage`;
  }

  update(id: number, updateChatbotMessageDto: UpdateChatbotMessageDto) {
    return `This action updates a #${id} chatbotMessage`;
  }

  remove(id: number) {
    return `This action removes a #${id} chatbotMessage`;
  }
}
