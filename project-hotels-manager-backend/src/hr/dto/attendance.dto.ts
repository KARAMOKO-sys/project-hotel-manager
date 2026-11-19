import { Type } from 'class-transformer';
import {
  IsDate,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { AttendanceSource } from '../schemas/attendance.entity';

export class CheckInDto {
  /** Établissement (doit être celui de l'affectation `staff_id`). */
  @IsMongoId()
  property_id!: string;

  @IsMongoId()
  staff_id!: string;

  @IsOptional()
  @IsEnum(AttendanceSource)
  source?: AttendanceSource;

  /** Horodatage (défaut : maintenant). */
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  at?: Date;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class CheckOutDto {
  /** Établissement (doit être celui de l'affectation `staff_id`). */
  @IsMongoId()
  property_id!: string;

  @IsMongoId()
  staff_id!: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  at?: Date;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

/** Saisie manuelle complète (correction, oubli de pointage). */
export class CreateAttendanceDto {
  /** Établissement (doit être celui de l'affectation `staff_id`). */
  @IsMongoId()
  property_id!: string;

  @IsMongoId()
  staff_id!: string;

  @Type(() => Date)
  @IsDate()
  check_in!: Date;

  @Type(() => Date)
  @IsDate()
  check_out!: Date;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class UpdateAttendanceDto {
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  check_in?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  check_out?: Date;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class AttendanceQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsMongoId()
  property_id?: string;

  @IsOptional()
  @IsMongoId()
  staff_id?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

export class AttendanceReportQueryDto {
  @IsMongoId()
  property_id!: string;

  @IsDateString()
  from!: string;

  /** Inclus. */
  @IsDateString()
  to!: string;

  @IsOptional()
  @IsMongoId()
  staff_id?: string;
}
