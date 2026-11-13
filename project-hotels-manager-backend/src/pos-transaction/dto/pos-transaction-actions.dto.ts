import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { PosCategory } from '../../pos-item/schemas/pos-item.entity';
import {
  PosSettlementType,
  PosTransactionStatus,
} from '../schemas/pos-transaction.entity';

export class VoidPosTransactionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}

export class RefundPosTransactionDto {
  /** Montant à rembourser ; par défaut le solde restant. */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  /** Remet les articles en stock (remboursement total uniquement). */
  @IsOptional()
  @IsBoolean()
  restock?: boolean;
}

export class SettlePosTransactionDto {
  @IsMongoId()
  invoice_id!: string;
}

export class PosTransactionQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsMongoId()
  property_id?: string;

  @IsOptional()
  @IsEnum(PosTransactionStatus)
  status?: PosTransactionStatus;

  @IsOptional()
  @IsEnum(PosSettlementType)
  settlement_type?: PosSettlementType;

  @IsOptional()
  @IsEnum(PosCategory)
  outlet?: PosCategory;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

export class TopSellingQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  limit?: number;
}
