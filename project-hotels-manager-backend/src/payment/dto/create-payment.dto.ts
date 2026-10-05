import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaymentMethod } from '../../base-entities/enums/payment-method.enum';
import { PaymentStatus } from '../../base-entities/enums/payment-status.enum';
import { MoneyDto } from '../../common/dto/money.dto';

export class CreatePaymentDto {
  @IsOptional()
  @IsMongoId()
  invoice_id?: string;

  @IsOptional()
  @IsMongoId()
  reservation_id?: string;

  @IsOptional()
  @IsMongoId()
  guest_id?: string;

  @IsOptional()
  @IsMongoId()
  property_id?: string;

  @ValidateNested()
  @Type(() => MoneyDto)
  amount!: MoneyDto;

  @IsOptional()
  @IsEnum(PaymentMethod)
  method?: PaymentMethod;

  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @IsOptional()
  @IsString()
  transaction_id?: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  received_amount?: number;

  @IsOptional()
  @IsDateString()
  paid_at?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
