import { PartialType } from '@nestjs/mapped-types';
import { IsDateString, IsOptional } from 'class-validator';
import { CreateReportDto } from './create-report.dto';

/**
 * Mise à jour de la définition. Le statut, les données et la programmation
 * évoluent via les routes `generate`, `schedule` et `unschedule`.
 */
export class UpdateReportDto extends PartialType(CreateReportDto) {
  @IsOptional()
  @IsDateString()
  period_start?: string;

  @IsOptional()
  @IsDateString()
  period_end?: string;
}
