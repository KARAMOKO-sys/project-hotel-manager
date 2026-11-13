import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsMongoId,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaymentMethod } from '../../base-entities/enums/payment-method.enum';
import { PosCategory } from '../../pos-item/schemas/pos-item.entity';
import { PosSettlementType } from '../schemas/pos-transaction.entity';

/** Ligne de vente : le prix et la taxe sont repris du catalogue. */
export class CreatePosTransactionLineDto {
  @IsMongoId()
  item_id!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  /** Remise sur la ligne (montant). */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  discount?: number;
}

export class CreatePosTransactionDto {
  @IsMongoId()
  property_id!: string;

  @IsOptional()
  @IsEnum(PosCategory)
  outlet?: PosCategory;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatePosTransactionLineDto)
  items!: CreatePosTransactionLineDto[];

  @IsEnum(PosSettlementType)
  settlement_type!: PosSettlementType;

  /** Obligatoire pour un paiement direct. */
  @IsOptional()
  @IsEnum(PaymentMethod)
  payment_method?: PaymentMethod;

  /** Obligatoire pour une imputation sur chambre. */
  @IsOptional()
  @IsMongoId()
  reservation_id?: string;

  @IsOptional()
  @IsMongoId()
  guest_id?: string;

  @IsOptional()
  @IsMongoId()
  room_id?: string;

  @IsOptional()
  @IsMongoId()
  cashier_id?: string;

  @IsOptional()
  @IsDateString()
  transaction_date?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
