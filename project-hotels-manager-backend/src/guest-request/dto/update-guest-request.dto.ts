import { PartialType } from '@nestjs/mapped-types';
import { CreateGuestRequestDto } from './create-guest-request.dto';

export class UpdateGuestRequestDto extends PartialType(CreateGuestRequestDto) {}
