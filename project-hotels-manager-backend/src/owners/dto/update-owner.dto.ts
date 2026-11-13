import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateOwnerDto } from './create-owner.dto';

/**
 * DTO de mise à jour d'un propriétaire.
 *
 * Exclut le mot de passe (route `PATCH /owners/:id/password`) et le plan
 * d'abonnement (route `PATCH /owners/:id/subscription`).
 */
export class UpdateOwnerDto extends PartialType(
  OmitType(CreateOwnerDto, ['password', 'subscription_plan'] as const),
) {}
