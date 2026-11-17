import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateReceptionistDto } from './create-receptionist.dto';

/**
 * DTO de mise à jour d'un réceptionniste.
 *
 * Tous les champs sont optionnels. Le mot de passe est exclu : il se modifie
 * via `PATCH /receptionists/:id/password`.
 */
export class UpdateReceptionistDto extends PartialType(
  OmitType(CreateReceptionistDto, ['password'] as const),
) {}
