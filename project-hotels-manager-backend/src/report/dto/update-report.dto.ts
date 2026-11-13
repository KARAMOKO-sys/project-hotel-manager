import { PartialType } from '@nestjs/mapped-types';
import { CreateReportDto } from './create-report.dto';

/**
 * Mise à jour de la définition. Le statut, les données et la programmation
 * évoluent via les routes `generate`, `schedule` et `unschedule`.
 */
export class UpdateReportDto extends PartialType(CreateReportDto) {}
