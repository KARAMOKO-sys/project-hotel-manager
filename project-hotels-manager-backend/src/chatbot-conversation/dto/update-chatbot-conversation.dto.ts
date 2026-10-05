import { PartialType } from '@nestjs/mapped-types';
import { CreateChatbotConversationDto } from './create-chatbot-conversation.dto';

export class UpdateChatbotConversationDto extends PartialType(
  CreateChatbotConversationDto,
) {}
