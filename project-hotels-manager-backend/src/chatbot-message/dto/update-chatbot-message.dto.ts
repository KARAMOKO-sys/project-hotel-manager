import { PartialType } from '@nestjs/mapped-types';
import { CreateChatbotMessageDto } from './create-chatbot-message.dto';

export class UpdateChatbotMessageDto extends PartialType(
  CreateChatbotMessageDto,
) {}
