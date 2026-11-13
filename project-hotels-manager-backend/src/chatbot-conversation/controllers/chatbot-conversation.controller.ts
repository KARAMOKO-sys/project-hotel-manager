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
import { ChatbotConversationService } from '../services/chatbot-conversation.service';
import { CreateChatbotConversationDto } from '../dto/create-chatbot-conversation.dto';
import { UpdateChatbotConversationDto } from '../dto/update-chatbot-conversation.dto';
import { ConversationFilterQueryDto } from '../dto/conversation-filter-query.dto';
import {
  AnalyzeMessageDto,
  CloseConversationDto,
  EscalateConversationDto,
  GuestMessageDto,
  StaffReplyDto,
} from '../dto/guest-message.dto';
import { IdParamDto } from '../../common/dto/id-param.dto';

@Controller('chatbot-conversations')
export class ChatbotConversationController {
  constructor(
    private readonly chatbotConversationService: ChatbotConversationService,
  ) {}

  @Post()
  create(@Body() createChatbotConversationDto: CreateChatbotConversationDto) {
    return this.chatbotConversationService.create(createChatbotConversationDto);
  }

  @Get()
  findAll(@Query() query: ConversationFilterQueryDto) {
    return this.chatbotConversationService.findAll(
      query,
      query.status ? { status: query.status } : {},
    );
  }

  @Post('analyze')
  analyzeMessage(@Body() dto: AnalyzeMessageDto) {
    return this.chatbotConversationService.analyzeMessage(dto);
  }

  @Get('session/:sessionId')
  findBySession(@Param('sessionId') sessionId: string) {
    return this.chatbotConversationService.findBySession(sessionId);
  }

  @Get('guest/:guestId')
  findByGuest(
    @Param('guestId') guestId: string,
    @Query() query: ConversationFilterQueryDto,
  ) {
    return this.chatbotConversationService.findByGuest(guestId, query);
  }

  @Get('property/:propertyId')
  findByProperty(
    @Param('propertyId') propertyId: string,
    @Query() query: ConversationFilterQueryDto,
  ) {
    return this.chatbotConversationService.findByProperty(propertyId, query);
  }

  @Get('property/:propertyId/stats')
  getPropertyStats(@Param('propertyId') propertyId: string) {
    return this.chatbotConversationService.getPropertyStats(propertyId);
  }

  @Get(':id')
  findOne(@Param() params: IdParamDto) {
    return this.chatbotConversationService.findOne(params.id);
  }

  @Get(':id/messages')
  getHistory(@Param() params: IdParamDto) {
    return this.chatbotConversationService.getHistory(params.id);
  }

  @Get(':id/suggested-replies')
  getSuggestedReplies(@Param() params: IdParamDto) {
    return this.chatbotConversationService.getSuggestedReplies(params.id);
  }

  @Post(':id/messages')
  handleGuestMessage(
    @Param() params: IdParamDto,
    @Body() dto: GuestMessageDto,
  ) {
    return this.chatbotConversationService.handleGuestMessage(params.id, dto);
  }

  @Post(':id/staff-reply')
  staffReply(@Param() params: IdParamDto, @Body() dto: StaffReplyDto) {
    return this.chatbotConversationService.staffReply(params.id, dto);
  }

  @Patch(':id')
  update(
    @Param() params: IdParamDto,
    @Body() updateChatbotConversationDto: UpdateChatbotConversationDto,
  ) {
    return this.chatbotConversationService.update(
      params.id,
      updateChatbotConversationDto,
    );
  }

  @Patch(':id/escalate')
  escalate(@Param() params: IdParamDto, @Body() dto: EscalateConversationDto) {
    return this.chatbotConversationService.escalate(params.id, dto);
  }

  @Patch(':id/close')
  close(@Param() params: IdParamDto, @Body() dto: CloseConversationDto) {
    return this.chatbotConversationService.close(params.id, dto);
  }

  @Patch(':id/reopen')
  reopen(@Param() params: IdParamDto) {
    return this.chatbotConversationService.reopen(params.id);
  }

  @Delete(':id')
  remove(@Param() params: IdParamDto) {
    return this.chatbotConversationService.remove(params.id);
  }
}
