import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateBlockedDateDto } from './create-blocked-date.dto';

/** La propriété d'un blocage ne peut pas être modifiée. */
export class UpdateBlockedDateDto extends PartialType(
  OmitType(CreateBlockedDateDto, ['property_id'] as const),
) {}
