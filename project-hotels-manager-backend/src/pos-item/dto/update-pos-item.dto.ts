import { PartialType } from '@nestjs/mapped-types';
import { CreatePosItemDto } from './create-pos-item.dto';

export class UpdatePosItemDto extends PartialType(CreatePosItemDto) {}
