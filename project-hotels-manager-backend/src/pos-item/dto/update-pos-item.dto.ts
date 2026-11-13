import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreatePosItemDto } from './create-pos-item.dto';

/**
 * Le stock n'est pas modifiable par la mise à jour générique : utiliser les
 * routes dédiées d'ajustement / d'inventaire.
 */
export class UpdatePosItemDto extends PartialType(
  OmitType(CreatePosItemDto, ['property_id', 'stock_quantity'] as const),
) {}
