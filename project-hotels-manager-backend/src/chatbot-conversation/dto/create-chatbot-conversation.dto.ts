import { IsEnum, IsMongoId, IsObject, IsOptional } from 'class-validator';
import {
  ChatbotChannel,
  ChatbotLanguage,
} from '../schemas/chatbot-conversation.entity';

export class CreateChatbotConversationDto {
  @IsMongoId()
  property_id!: string;

  @IsOptional()
  @IsMongoId()
  guest_id?: string;

  @IsOptional()
  @IsMongoId()
  reservation_id?: string;

  @IsOptional()
  @IsEnum(ChatbotLanguage)
  language?: ChatbotLanguage;

  @IsOptional()
  @IsEnum(ChatbotChannel)
  channel?: ChatbotChannel;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
