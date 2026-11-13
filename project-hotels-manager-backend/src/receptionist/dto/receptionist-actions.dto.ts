import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  ReceptionistShiftType,
  ReceptionistStatus,
} from '../schemas/receptionist.entity';
import { ShiftScheduleDto } from './shift-schedule.dto';

/** Corps de la route de changement de mot de passe. */
export class ChangeReceptionistPasswordDto {
  @IsString()
  current_password!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  new_password!: string;
}

/** Corps de la route de suspension (raison optionnelle). */
export class SuspendReceptionistDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

/** Corps de la route de changement de statut (congé, inactif...). */
export class SetReceptionistStatusDto {
  @IsEnum(ReceptionistStatus)
  status!: ReceptionistStatus;
}

/** Corps de la route de mise à jour du planning. */
export class UpdateReceptionistScheduleDto {
  @ValidateNested()
  @Type(() => ShiftScheduleDto)
  shift_schedule!: ShiftScheduleDto;

  @IsOptional()
  @IsEnum(ReceptionistShiftType)
  shift_type?: ReceptionistShiftType;
}

/** Types d'activité comptabilisés pour un réceptionniste. */
export const RECEPTIONIST_ACTIVITIES = [
  'reservation',
  'checkin',
  'checkout',
  'cancellation',
] as const;

export type ReceptionistActivity = (typeof RECEPTIONIST_ACTIVITIES)[number];

/** Corps de la route d'enregistrement d'une activité. */
export class RecordReceptionistActivityDto {
  @IsIn(RECEPTIONIST_ACTIVITIES)
  type!: ReceptionistActivity;

  /** Durée de traitement en minutes (optionnelle). */
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1440)
  handling_time?: number;
}

/** Corps de la route de notation de satisfaction. */
export class SatisfactionScoreDto {
  @IsNumber()
  @Min(0)
  @Max(5)
  score!: number;
}
