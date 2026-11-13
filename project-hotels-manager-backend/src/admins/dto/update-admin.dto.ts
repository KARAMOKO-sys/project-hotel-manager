import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateAdminDto } from './create-admin.dto';

/**
 * DTO de mise à jour d'un super administrateur.
 *
 * Le mot de passe est exclu : il se modifie uniquement via la route dédiée
 * `PATCH /admins/:id/password`.
 */
export class UpdateAdminDto extends PartialType(
  OmitType(CreateAdminDto, ['password'] as const),
) {}
