import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ChatbotMessageService } from '../services/chatbot-message.service';
import { CreateChatbotMessageDto } from '../dto/create-chatbot-message.dto';
import { UpdateChatbotMessageDto } from '../dto/update-chatbot-message.dto';

@Controller('chatbot-message')
export class ChatbotMessageController {
  constructor(private readonly chatbotMessageService: ChatbotMessageService) {}

  @Post()
  create(@Body() createChatbotMessageDto: CreateChatbotMessageDto) {
    return this.chatbotMessageService.create(createChatbotMessageDto);
  }

  @Get()
  findAll() {
    return this.chatbotMessageService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.chatbotMessageService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateChatbotMessageDto: UpdateChatbotMessageDto,
  ) {
    return this.chatbotMessageService.update(+id, updateChatbotMessageDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.chatbotMessageService.remove(+id);
  }
}
