import { PartialType } from '@nestjs/mapped-types';
import { CreateGuestSegmentDto } from './create-guest-segment.dto';

export class UpdateGuestSegmentDto extends PartialType(CreateGuestSegmentDto) {}
