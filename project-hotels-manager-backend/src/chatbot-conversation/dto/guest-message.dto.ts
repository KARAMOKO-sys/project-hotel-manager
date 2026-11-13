import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ChatbotLanguage } from '../schemas/chatbot-conversation.entity';

/** Informations de l'établissement utilisées pour personnaliser les réponses FAQ. */
export class FaqContextDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  property_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  check_in_time?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  check_out_time?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  wifi_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  wifi_password?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  restaurant_hours?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  breakfast_hours?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  parking_info?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  reception_phone?: string;
}

/** Message envoyé par le client à l'assistant. */
export class GuestMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content!: string;

  /** Force la langue de réponse ; sinon détectée automatiquement. */
  @IsOptional()
  @IsEnum(ChatbotLanguage)
  language?: ChatbotLanguage;

  @IsOptional()
  @ValidateNested()
  @Type(() => FaqContextDto)
  context?: FaqContextDto;
}

/** Analyse d'un message sans persistance (prévisualisation NLU). */
export class AnalyzeMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content!: string;

  @IsOptional()
  @IsEnum(ChatbotLanguage)
  language?: ChatbotLanguage;
}

/** Message envoyé par un membre du personnel après escalade. */
export class StaffReplyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  content!: string;

  @IsOptional()
  @IsMongoId()
  staff_id?: string;
}

export class EscalateConversationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;

  @IsOptional()
  @IsMongoId()
  staff_id?: string;
}

export class CloseConversationDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  satisfaction_rating?: number;
}
