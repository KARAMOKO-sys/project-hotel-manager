import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import {
  ChatbotIntent,
  MessageSender,
} from '../schemas/chatbot-message.entity';

/** Filtres optionnels pour lister les messages d'une conversation. */
export class MessageFilterQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(MessageSender)
  sender?: MessageSender;

  @IsOptional()
  @IsEnum(ChatbotIntent)
  intent?: ChatbotIntent;
}
