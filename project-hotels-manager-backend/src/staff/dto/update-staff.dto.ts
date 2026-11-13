import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateStaffDto } from './create-staff.dto';

/**
 * DTO de mise à jour d'une affectation.
 *
 * L'utilisateur et la propriété ne sont pas modifiables ici : un changement
 * de propriété passe par `PATCH /staff/:id/transfer`, et le responsable par
 * `PATCH /staff/:id/manager`.
 */
export class UpdateStaffDto extends PartialType(
  OmitType(CreateStaffDto, [
    'user_id',
    'user_type',
    'property_id',
    'organization_id',
    'manager_id',
  ] as const),
) {}
