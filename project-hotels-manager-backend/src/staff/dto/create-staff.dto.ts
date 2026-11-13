import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsIn,
  IsMongoId,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { MoneyDto } from '../../common/dto/money.dto';
import {
  EmploymentType,
  STAFF_WEEK_DAYS,
  StaffDepartment,
  StaffUserType,
  type StaffWeekDay,
} from '../schemas/staff.entity';

/** Format `HH:mm` (00:00 à 23:59). */
export const STAFF_HOUR_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Créneau hebdomadaire de travail. */
export class StaffShiftDto {
  @IsIn(STAFF_WEEK_DAYS)
  day!: StaffWeekDay;

  @Matches(STAFF_HOUR_REGEX, { message: 'start doit être au format HH:mm' })
  start!: string;

  @Matches(STAFF_HOUR_REGEX, { message: 'end doit être au format HH:mm' })
  end!: string;
}

/** Contact d'urgence de l'employé. */
export class StaffEmergencyContactDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  relationship?: string;
}

/**
 * DTO de création d'une affectation (employé ↔ propriété).
 *
 * Le statut d'emploi démarre à « actif » ; il évolue ensuite via les routes
 * dédiées (congé, suspension, départ...).
 */
export class CreateStaffDto {
  @IsMongoId()
  user_id!: string;

  @IsEnum(StaffUserType)
  user_type!: StaffUserType;

  @IsOptional()
  @IsMongoId()
  organization_id?: string;

  @IsMongoId()
  property_id!: string;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  employee_code?: string;

  @IsString()
  @Length(1, 100)
  position!: string;

  @IsOptional()
  @IsEnum(StaffDepartment)
  department?: StaffDepartment;

  @IsOptional()
  @IsEnum(EmploymentType)
  employment_type?: EmploymentType;

  @IsOptional()
  @IsDateString()
  hire_date?: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;

  @IsOptional()
  @IsMongoId()
  manager_id?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StaffShiftDto)
  schedule?: StaffShiftDto[];

  /** Ignoré si un planning est fourni (calculé automatiquement). */
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(168)
  weekly_hours?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => MoneyDto)
  salary?: MoneyDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => StaffEmergencyContactDto)
  emergency_contact?: StaffEmergencyContactDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
