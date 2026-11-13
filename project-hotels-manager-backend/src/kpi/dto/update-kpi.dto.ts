import { PartialType } from '@nestjs/mapped-types';
import { CreateKpiDto } from './create-kpi.dto';

/** Mise à jour des données brutes : les indicateurs sont recalculés. */
export class UpdateKpiDto extends PartialType(CreateKpiDto) {}
