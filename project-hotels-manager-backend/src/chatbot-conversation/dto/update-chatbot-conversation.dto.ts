import { PartialType } from '@nestjs/mapped-types';
import { CreateChatbotConversationDto } from './create-chatbot-conversation.dto';

/**
 * Mise à jour simple des métadonnées d'une conversation.
 * Les changements de statut passent par les routes dédiées
 * (`escalate`, `close`, `reopen`).
 */
export class UpdateChatbotConversationDto extends PartialType(
  CreateChatbotConversationDto,
) {}
