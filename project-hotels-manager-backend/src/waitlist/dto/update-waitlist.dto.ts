import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateWaitlistDto } from './create-waitlist.dto';

/** Le client et la propriété d'une entrée ne sont pas modifiables. */
export class UpdateWaitlistDto extends PartialType(
  OmitType(CreateWaitlistDto, ['property_id', 'guest_id'] as const),
) {}
