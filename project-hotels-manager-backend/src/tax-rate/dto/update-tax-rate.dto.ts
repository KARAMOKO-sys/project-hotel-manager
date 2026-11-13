import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateTaxRateDto } from './create-tax-rate.dto';

/** La propriété d'un taux de taxe n'est pas modifiable. */
export class UpdateTaxRateDto extends PartialType(
  OmitType(CreateTaxRateDto, ['property_id'] as const),
) {}
