import { OmitType, PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { Currency } from '../../base-entities/enums/currency.enum';
import { VendorBillState } from '../purchase.utils';
import { PurchaseLineDto } from './purchase-order.dto';

export class CreateVendorBillDto {
  @IsMongoId()
  property_id!: string;

  @IsMongoId()
  vendor_id!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  vendor_reference?: string;

  @IsOptional()
  @IsDateString()
  bill_date?: string;

  /** Par défaut : date de facture + délai de paiement du fournisseur. */
  @IsOptional()
  @IsDateString()
  due_date?: string;

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

/** Brouillon uniquement ; les lignes d'une facture issue d'un BC sont figées. */
export class UpdateVendorBillDto extends PartialType(
  OmitType(CreateVendorBillDto, ['property_id', 'vendor_id'] as const),
) {}

export class MarkPaidDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  payment_reference?: string;

  @IsOptional()
  @IsDateString()
  paid_at?: string;
}

export class VendorBillQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsMongoId()
  property_id?: string;

  @IsOptional()
  @IsMongoId()
  vendor_id?: string;

  @IsOptional()
  @IsMongoId()
  purchase_order_id?: string;

  @IsOptional()
  @IsEnum(VendorBillState)
  state?: VendorBillState;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
