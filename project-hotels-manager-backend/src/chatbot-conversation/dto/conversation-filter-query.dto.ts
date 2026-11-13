import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { ConversationStatus } from '../schemas/chatbot-conversation.entity';

export class ConversationFilterQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(ConversationStatus)
  status?: ConversationStatus;
}
