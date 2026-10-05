import { PartialType } from '@nestjs/mapped-types';
import { CreateOtaConnectionDto } from './create-ota-connection.dto';

export class UpdateOtaConnectionDto extends PartialType(
  CreateOtaConnectionDto,
) {}
