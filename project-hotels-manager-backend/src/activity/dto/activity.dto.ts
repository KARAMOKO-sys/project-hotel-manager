import {
  IsDateString,
  IsEnum,
  IsIn,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { RecordMessageType } from '../schemas/record-message.entity';
import { RecordActivityType } from '../schemas/record-activity.entity';

/** Message saisi par un utilisateur (note interne ou commentaire). */
export class PostMessageDto {
  @IsOptional()
  @IsIn([RecordMessageType.NOTE, RecordMessageType.COMMENT])
  message_type?: RecordMessageType.NOTE | RecordMessageType.COMMENT;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  body!: string;
}

/** Planification d'une activité sur une fiche. */
export class ScheduleActivityDto {
  @IsOptional()
  @IsEnum(RecordActivityType)
  activity_type?: RecordActivityType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  summary!: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  note?: string;

  @IsDateString()
  due_date!: string;

  /** Utilisateur responsable (par défaut : l'auteur). */
  @IsOptional()
  @IsMongoId()
  assigned_to?: string;
}

/** Clôture d'une activité. */
export class MarkActivityDoneDto {
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  feedback?: string;
}

/** Filtre de « Mes activités ». */
export class MyActivitiesQueryDto {
  @IsOptional()
  @IsMongoId()
  property_id?: string;
}
