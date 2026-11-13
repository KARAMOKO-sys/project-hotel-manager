import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreatePartnerDto } from './create-partner.dto';

/**
 * DTO de mise à jour d'un partenaire.
 *
 * Exclut le mot de passe (route `PATCH /partners/:id/password`) et les
 * consentements, qui ne sont donnés qu'à l'inscription.
 */
export class UpdatePartnerDto extends PartialType(
  OmitType(CreatePartnerDto, [
    'password',
    'terms_accepted',
    'data_processing_accepted',
  ] as const),
) {}
