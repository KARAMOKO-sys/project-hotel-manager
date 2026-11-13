import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ChatbotMessageService } from '../services/chatbot-message.service';
import { CreateChatbotMessageDto } from '../dto/create-chatbot-message.dto';
import { UpdateChatbotMessageDto } from '../dto/update-chatbot-message.dto';
import { MessageFilterQueryDto } from '../dto/message-filter-query.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { IdParamDto } from '../../common/dto/id-param.dto';

@Controller('chatbot-messages')
export class ChatbotMessageController {
  constructor(private readonly chatbotMessageService: ChatbotMessageService) {}

  @Post()
  create(@Body() createChatbotMessageDto: CreateChatbotMessageDto) {
    return this.chatbotMessageService.create(createChatbotMessageDto);
  }

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.chatbotMessageService.findAll(query);
  }

  @Get('requiring-human')
  findRequiringHuman(@Query() query: MessageFilterQueryDto) {
    return this.chatbotMessageService.findRequiringHuman(query);
  }

  @Get('conversation/:conversationId')
  findByConversation(
    @Param('conversationId') conversationId: string,
    @Query() query: MessageFilterQueryDto,
  ) {
    return this.chatbotMessageService.findByConversation(conversationId, query);
  }

  @Get('conversation/:conversationId/history')
  getConversationHistory(@Param('conversationId') conversationId: string) {
    return this.chatbotMessageService.getConversationHistory(conversationId);
  }

  @Get('conversation/:conversationId/intents')
  getIntentStats(@Param('conversationId') conversationId: string) {
    return this.chatbotMessageService.getIntentStats(conversationId);
  }

  @Patch('conversation/:conversationId/read')
  markConversationAsRead(@Param('conversationId') conversationId: string) {
    return this.chatbotMessageService.markConversationAsRead(conversationId);
  }

  @Get(':id')
  findOne(@Param() params: IdParamDto) {
    return this.chatbotMessageService.findOne(params.id);
  }

  @Patch(':id')
  update(
    @Param() params: IdParamDto,
    @Body() updateChatbotMessageDto: UpdateChatbotMessageDto,
  ) {
    return this.chatbotMessageService.update(
      params.id,
      updateChatbotMessageDto,
    );
  }

  @Patch(':id/read')
  markAsRead(@Param() params: IdParamDto) {
    return this.chatbotMessageService.markAsRead(params.id);
  }

  @Delete(':id')
  remove(@Param() params: IdParamDto) {
    return this.chatbotMessageService.remove(params.id);
  }
}
