import { PartialType, PickType } from '@nestjs/mapped-types';
import { CreateDailyPriceDto } from './create-daily-price.dto';

/** Seuls le prix et ses attributs sont modifiables (pas la clé type/plan/date). */
export class UpdateDailyPriceDto extends PartialType(
  PickType(CreateDailyPriceDto, [
    'price',
    'min_stay',
    'is_closed',
    'source',
    'notes',
  ] as const),
) {}
