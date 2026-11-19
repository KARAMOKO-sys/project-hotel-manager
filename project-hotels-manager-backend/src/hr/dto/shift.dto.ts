import { PartialType, OmitType } from '@nestjs/mapped-types';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { HOUR_MINUTE_REGEX } from '../hr.utils';
import { ShiftState } from '../schemas/shift-assignment.entity';

export class CreateShiftDto {
  /** Établissement (doit être celui de l'affectation `staff_id`). */
  @IsMongoId()
  property_id!: string;

  @IsMongoId()
  staff_id!: string;

  @IsOptional()
  @IsMongoId()
  department_id?: string;

  @IsDateString()
  date!: string;

  @Matches(HOUR_MINUTE_REGEX, {
    message: 'Heure de début attendue au format HH:mm',
  })
  start_time!: string;

  /** Si inférieure ou égale au début : fin le lendemain (service de nuit). */
  @Matches(HOUR_MINUTE_REGEX, {
    message: 'Heure de fin attendue au format HH:mm',
  })
  end_time!: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  role?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class UpdateShiftDto extends PartialType(
  OmitType(CreateShiftDto, ['staff_id', 'property_id'] as const),
) {}

export class ShiftQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsMongoId()
  property_id?: string;

  @IsOptional()
  @IsMongoId()
  staff_id?: string;

  @IsOptional()
  @IsMongoId()
  department_id?: string;

  @IsOptional()
  @IsEnum(ShiftState)
  state?: ShiftState;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

export class ShiftWeekQueryDto {
  @IsMongoId()
  property_id!: string;

  /** Premier jour de la semaine affichée. */
  @IsDateString()
  start!: string;

  @IsOptional()
  @IsMongoId()
  department_id?: string;
}

export class CopyWeekDto {
  @IsMongoId()
  property_id!: string;

  /** Premier jour de la semaine source. */
  @IsDateString()
  source_start!: string;

  /** Premier jour de la semaine cible (défaut : source + 7 jours). */
  @IsOptional()
  @IsDateString()
  target_start?: string;

  @IsOptional()
  @IsMongoId()
  department_id?: string;

  /** Copier aussi les créneaux confirmés comme confirmés (défaut : planifiés). */
  @IsOptional()
  @IsBoolean()
  keep_state?: boolean;
}
