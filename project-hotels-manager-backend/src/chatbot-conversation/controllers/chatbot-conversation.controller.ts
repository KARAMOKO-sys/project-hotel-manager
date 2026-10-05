import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ChatbotConversationService } from '../services/chatbot-conversation.service';
import { CreateChatbotConversationDto } from '../dto/create-chatbot-conversation.dto';
import { UpdateChatbotConversationDto } from '../dto/update-chatbot-conversation.dto';

@Controller('chatbot-conversation')
export class ChatbotConversationController {
  constructor(
    private readonly chatbotConversationService: ChatbotConversationService,
  ) {}

  @Post()
  create(@Body() createChatbotConversationDto: CreateChatbotConversationDto) {
    return this.chatbotConversationService.create(createChatbotConversationDto);
  }

  @Get()
  findAll() {
    return this.chatbotConversationService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.chatbotConversationService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateChatbotConversationDto: UpdateChatbotConversationDto,
  ) {
    return this.chatbotConversationService.update(
      +id,
      updateChatbotConversationDto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.chatbotConversationService.remove(+id);
  }
}
