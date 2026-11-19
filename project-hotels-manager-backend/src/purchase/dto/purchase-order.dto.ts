import { OmitType, PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { Currency } from '../../base-entities/enums/currency.enum';
import { BillingStatus, PurchaseOrderState } from '../purchase.utils';

/** Ligne saisie (quantités reçues/facturées et montants : serveur). */
export class PurchaseLineDto {
  @IsOptional()
  @IsMongoId()
  product_id?: string;

  /** Par défaut : nom de l'article. */
  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  quantity!: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unit_price!: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  tax_rate?: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  account_code?: string;
}

export class CreatePurchaseOrderDto {
  @IsMongoId()
  property_id!: string;

  @IsMongoId()
  vendor_id!: string;

  @IsOptional()
  @IsDateString()
  order_date?: string;

  @IsOptional()
  @IsDateString()
  expected_date?: string;

  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => PurchaseLineDto)
  lines!: PurchaseLineDto[];

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

/** Modifiable à l'état brouillon ou envoyé uniquement. */
export class UpdatePurchaseOrderDto extends PartialType(
  OmitType(CreatePurchaseOrderDto, ['property_id'] as const),
) {}

export class ReceiveLineDto {
  @IsInt()
  @Min(0)
  line_index!: number;

  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  quantity!: number;
}

export class ReceivePurchaseOrderDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => ReceiveLineDto)
  lines!: ReceiveLineDto[];
}

export class BillPurchaseOrderDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  vendor_reference?: string;

  @IsOptional()
  @IsDateString()
  bill_date?: string;
}

export class PurchaseOrderQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsMongoId()
  property_id?: string;

  @IsOptional()
  @IsMongoId()
  vendor_id?: string;

  @IsOptional()
  @IsEnum(PurchaseOrderState)
  state?: PurchaseOrderState;

  @IsOptional()
  @IsEnum(BillingStatus)
  billing_status?: BillingStatus;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

export class CancelReasonDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason?: string;
}
