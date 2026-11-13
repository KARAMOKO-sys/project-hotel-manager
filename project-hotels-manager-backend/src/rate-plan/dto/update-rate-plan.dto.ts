import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateRatePlanDto } from './create-rate-plan.dto';

/** La propriété d'un plan tarifaire n'est pas modifiable. */
export class UpdateRatePlanDto extends PartialType(
  OmitType(CreateRatePlanDto, ['property_id'] as const),
) {}
