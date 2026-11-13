import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { StaffDepartment } from '../schemas/staff.entity';
import { StaffShiftDto } from './create-staff.dto';

/** Corps des routes de changement de statut avec raison optionnelle. */
export class StaffStatusReasonDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

/** Corps de la route de fin de contrat. */
export class TerminateStaffDto {
  @IsString()
  @Length(3, 500)
  reason!: string;

  /** Date de départ (par défaut : aujourd'hui). */
  @IsOptional()
  @IsDateString()
  end_date?: string;
}

/** Corps de la route de mutation vers une autre propriété. */
export class TransferStaffDto {
  @IsMongoId()
  property_id!: string;

  @IsOptional()
  @IsMongoId()
  organization_id?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  position?: string;

  @IsOptional()
  @IsEnum(StaffDepartment)
  department?: StaffDepartment;
}

/** Corps de la route d'affectation d'un responsable. */
export class AssignStaffManagerDto {
  @IsMongoId()
  manager_id!: string;
}

/** Corps de la route de mise à jour du planning. */
export class UpdateStaffScheduleDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StaffShiftDto)
  schedule!: StaffShiftDto[];
}
