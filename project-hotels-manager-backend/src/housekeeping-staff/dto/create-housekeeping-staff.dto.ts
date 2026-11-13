import {
  ArrayUnique,
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsMongoId,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  ShiftType,
  SpecializationType,
} from '../schemas/housekeeping-staff.entity';

/** Format `HH:mm` (00:00 à 23:59). */
export const HOUR_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Jours de la semaine acceptés pour `working_days`. */
export const WORKING_DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

/**
 * DTO de création d'un membre du personnel de ménage.
 *
 * Le mot de passe est fourni en clair puis hashé par le service.
 */
export class CreateHousekeepingStaffDto {
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @IsMongoId()
  property_id!: string;

  @IsString()
  @Length(1, 50)
  employee_code!: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  first_name?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  last_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  avatar_url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  language?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  timezone?: string;

  @IsOptional()
  @IsDateString()
  hire_date?: string;

  @IsOptional()
  @IsEnum(SpecializationType)
  specialization?: SpecializationType;

  @IsOptional()
  @Matches(HOUR_REGEX, { message: 'shift_start doit être au format HH:mm' })
  shift_start?: string;

  @IsOptional()
  @Matches(HOUR_REGEX, { message: 'shift_end doit être au format HH:mm' })
  shift_end?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsIn(WORKING_DAYS, { each: true })
  working_days?: string[];

  @IsOptional()
  @IsEnum(ShiftType)
  shift_type?: ShiftType;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  supervisor_name?: string;

  @IsOptional()
  @IsMongoId()
  supervisor_id?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  certifications?: string[];

  /** Objectif mensuel de chambres nettoyées. */
  @IsOptional()
  @IsInt()
  @Min(0)
  monthly_target?: number;

  @IsOptional()
  @IsObject()
  assigned_equipment?: Record<string, any>;

  @IsOptional()
  @IsObject()
  preferences?: Record<string, any>;
}
