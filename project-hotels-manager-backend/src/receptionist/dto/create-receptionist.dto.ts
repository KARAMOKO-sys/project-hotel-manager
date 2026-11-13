import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsMongoId,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ReceptionistShiftType } from '../schemas/receptionist.entity';
import { ShiftScheduleDto } from './shift-schedule.dto';

/**
 * DTO de création d'un réceptionniste rattaché à une propriété.
 *
 * Le mot de passe est fourni en clair puis hashé par le service.
 */
export class CreateReceptionistDto {
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
  @IsString()
  @MaxLength(100)
  position?: string;

  @IsOptional()
  @IsBoolean()
  can_modify_reservations?: boolean;

  @IsOptional()
  @IsBoolean()
  can_override_prices?: boolean;

  /** Remise maximale (en %) que le réceptionniste peut accorder. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  max_discount_percent?: number;

  @IsOptional()
  @IsBoolean()
  can_check_in_out?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => ShiftScheduleDto)
  shift_schedule?: ShiftScheduleDto;

  @IsOptional()
  @IsEnum(ReceptionistShiftType)
  shift_type?: ReceptionistShiftType;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @IsOptional()
  @IsObject()
  preferences?: Record<string, any>;
}
