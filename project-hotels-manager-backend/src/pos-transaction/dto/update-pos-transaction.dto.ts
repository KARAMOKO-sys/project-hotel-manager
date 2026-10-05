import { PartialType } from '@nestjs/mapped-types';
import { CreatePosTransactionDto } from './create-pos-transaction.dto';

export class UpdatePosTransactionDto extends PartialType(
  CreatePosTransactionDto,
) {}
