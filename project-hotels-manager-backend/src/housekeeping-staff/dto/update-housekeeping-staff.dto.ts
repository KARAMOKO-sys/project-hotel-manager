import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateHousekeepingStaffDto } from './create-housekeeping-staff.dto';

/**
 * DTO de mise à jour d'un membre du personnel de ménage.
 *
 * Le mot de passe est exclu : il se modifie via
 * `PATCH /housekeeping-staff/:id/password`.
 */
export class UpdateHousekeepingStaffDto extends PartialType(
  OmitType(CreateHousekeepingStaffDto, ['password'] as const),
) {}
