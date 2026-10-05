import { PartialType } from '@nestjs/mapped-types';
import { CreateGuestPreferenceDto } from './create-guest-preference.dto';

export class UpdateGuestPreferenceDto extends PartialType(
  CreateGuestPreferenceDto,
) {}
