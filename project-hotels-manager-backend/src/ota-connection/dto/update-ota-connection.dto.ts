import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateOtaConnectionDto } from './create-ota-connection.dto';

/**
 * L'établissement et le fournisseur sont figés ; les identifiants et les
 * correspondances de chambres passent par des routes dédiées.
 */
export class UpdateOtaConnectionDto extends PartialType(
  OmitType(CreateOtaConnectionDto, [
    'property_id',
    'provider',
    'credentials',
    'room_mappings',
  ] as const),
) {}
