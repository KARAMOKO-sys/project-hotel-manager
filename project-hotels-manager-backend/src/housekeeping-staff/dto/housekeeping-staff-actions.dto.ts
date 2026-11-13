import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  HousekeepingStatus,
  ShiftType,
} from '../schemas/housekeeping-staff.entity';
import { HOUR_REGEX, WORKING_DAYS } from './create-housekeeping-staff.dto';

/** Corps de la route de changement de mot de passe. */
export class ChangeHousekeepingPasswordDto {
  @IsString()
  current_password!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  new_password!: string;
}

/** Corps de la route de suspension (raison optionnelle). */
export class SuspendHousekeepingStaffDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

/** Corps de la route de changement de statut (congé, maladie...). */
export class SetHousekeepingStatusDto {
  @IsEnum(HousekeepingStatus)
  status!: HousekeepingStatus;
}

/** Corps de la route de mise à jour des horaires de travail. */
export class UpdateHousekeepingScheduleDto {
  @Matches(HOUR_REGEX, { message: 'shift_start doit être au format HH:mm' })
  shift_start!: string;

  @Matches(HOUR_REGEX, { message: 'shift_end doit être au format HH:mm' })
  shift_end!: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsIn(WORKING_DAYS, { each: true })
  working_days?: string[];

  @IsOptional()
  @IsEnum(ShiftType)
  shift_type?: ShiftType;
}

/** Corps de la route d'enregistrement d'un nettoyage de chambre. */
export class RecordCleaningDto {
  @IsMongoId()
  room_id!: string;

  @IsString()
  @Length(1, 20)
  room_number!: string;

  /** Durée du nettoyage en minutes. */
  @IsNumber()
  @Min(1)
  @Max(600)
  cleaning_time!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  quality_score?: number;

  @IsOptional()
  @IsBoolean()
  issue_reported?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

/** Corps de la route de signalement d'un problème. */
export class ReportIssueDto {
  @IsMongoId()
  room_id!: string;

  @IsString()
  @Length(1, 20)
  room_number!: string;

  @IsString()
  @Length(1, 100)
  issue_type!: string;

  @IsString()
  @Length(1, 1000)
  description!: string;
}

/** Corps de la route de définition de l'objectif mensuel. */
export class MonthlyTargetDto {
  @IsInt()
  @Min(0)
  monthly_target!: number;
}

/** Corps de la route d'affectation d'un superviseur. */
export class AssignSupervisorDto {
  @IsMongoId()
  supervisor_id!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  supervisor_name?: string;
}
