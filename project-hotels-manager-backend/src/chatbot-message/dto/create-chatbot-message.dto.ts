import {
  IsBoolean,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ChatbotLanguage } from '../../chatbot-conversation/schemas/chatbot-conversation.entity';
import {
  ChatbotIntent,
  MessageSender,
} from '../schemas/chatbot-message.entity';

export class CreateChatbotMessageDto {
  @IsMongoId()
  conversation_id!: string;

  @IsEnum(MessageSender)
  sender!: MessageSender;

  @IsOptional()
  @IsMongoId()
  sender_id?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  content!: string;

  @IsOptional()
  @IsEnum(ChatbotLanguage)
  language?: ChatbotLanguage;

  @IsOptional()
  @IsEnum(ChatbotIntent)
  intent?: ChatbotIntent;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence?: number;

  @IsOptional()
  @IsObject()
  entities?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  is_service_request?: boolean;

  @IsOptional()
  @IsBoolean()
  requires_human?: boolean;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
