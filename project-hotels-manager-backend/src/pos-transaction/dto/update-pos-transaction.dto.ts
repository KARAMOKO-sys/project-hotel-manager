import { PartialType, PickType } from '@nestjs/mapped-types';
import { CreatePosTransactionDto } from './create-pos-transaction.dto';

/**
 * Seules les informations descriptives sont modifiables : les lignes et
 * montants d'une transaction sont figés (utiliser annulation / remboursement).
 */
export class UpdatePosTransactionDto extends PartialType(
  PickType(CreatePosTransactionDto, ['notes', 'metadata'] as const),
) {}
