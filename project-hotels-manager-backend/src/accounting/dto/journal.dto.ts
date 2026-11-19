import { OmitType, PartialType } from '@nestjs/mapped-types';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { JournalType } from '../domain/accounting.enums';

/** Création d'un journal comptable. */
export class CreateJournalDto {
  @IsMongoId()
  property_id!: string;

  /** Code court (préfixe de numérotation), ex. VTE, ACH, CAI. */
  @IsString()
  @Matches(/^[A-Za-z0-9]{1,10}$/, {
    message: 'Le code doit comporter 1 à 10 lettres ou chiffres',
  })
  code!: string;

  @IsString()
  @MaxLength(100)
  name!: string;

  @IsEnum(JournalType)
  type!: JournalType;

  @IsOptional()
  @IsMongoId()
  default_account_id?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class UpdateJournalDto extends PartialType(
  OmitType(CreateJournalDto, ['property_id'] as const),
) {}

export class JournalQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsMongoId()
  property_id?: string;

  @IsOptional()
  @IsEnum(JournalType)
  type?: JournalType;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  is_active?: boolean;
}
