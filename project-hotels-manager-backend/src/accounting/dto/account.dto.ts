import { OmitType, PartialType } from '@nestjs/mapped-types';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { AccountType } from '../domain/accounting.enums';
import { ACCOUNT_CODE_PATTERN } from '../domain/accounting.logic';

const toBoolean = ({ value }: { value: unknown }) =>
  value === 'true' ? true : value === 'false' ? false : value;

/** Création d'un compte du plan comptable. */
export class CreateAccountDto {
  @IsMongoId()
  property_id!: string;

  /** Code SYSCOHADA (chiffres, premier chiffre = classe 1–9). */
  @IsString()
  @Matches(ACCOUNT_CODE_PATTERN, {
    message: 'Le code doit comporter 2 à 12 chiffres et commencer par 1–9',
  })
  code!: string;

  @IsString()
  @MaxLength(150)
  name!: string;

  /** Déduite du code si absente. */
  @IsOptional()
  @IsEnum(AccountType)
  account_type?: AccountType;

  @IsOptional()
  @IsBoolean()
  reconcilable?: boolean;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class UpdateAccountDto extends PartialType(
  OmitType(CreateAccountDto, ['property_id'] as const),
) {}

export class AccountQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsMongoId()
  property_id?: string;

  @IsOptional()
  @IsEnum(AccountType)
  account_type?: AccountType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(9)
  syscohada_class?: number;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  is_active?: boolean;
}
