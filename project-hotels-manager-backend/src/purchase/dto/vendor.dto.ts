import { OmitType, PartialType } from '@nestjs/mapped-types';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { Currency } from '../../base-entities/enums/currency.enum';

export class VendorContactDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Adresse e-mail invalide' })
  @MaxLength(200)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;
}

export class CreateVendorDto {
  @IsMongoId()
  property_id!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{1,30}$/, {
    message: 'Code invalide (lettres, chiffres, - et _, 30 caractères max.)',
  })
  code?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => VendorContactDto)
  contact?: VendorContactDto;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  tax_id?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(365)
  payment_term_days?: number;

  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class UpdateVendorDto extends PartialType(
  OmitType(CreateVendorDto, ['property_id'] as const),
) {}

export class VendorQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsMongoId()
  property_id?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  is_active?: boolean;
}
