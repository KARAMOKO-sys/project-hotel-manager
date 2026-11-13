import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateAccountantDto } from './create-accountant.dto';

/**
 * DTO de mise à jour d'un comptable.
 *
 * Le mot de passe est exclu : il se modifie via `PATCH /accountants/:id/password`.
 */
export class UpdateAccountantDto extends PartialType(
  OmitType(CreateAccountantDto, ['password'] as const),
) {}
