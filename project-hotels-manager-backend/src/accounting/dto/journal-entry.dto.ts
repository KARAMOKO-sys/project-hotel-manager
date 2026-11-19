import { OmitType, PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { Currency } from '../../base-entities/enums/currency.enum';
import { JournalEntryState, PartnerType } from '../domain/accounting.enums';

/** Ligne d'écriture saisie : un débit OU un crédit strictement positif. */
export class JournalEntryLineDto {
  @IsMongoId()
  account_id!: string;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  label?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  debit?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  credit?: number;

  @IsOptional()
  @IsEnum(PartnerType)
  partner_type?: PartnerType;

  @IsOptional()
  @IsMongoId()
  partner_id?: string;
}

/**
 * Création d'une écriture en brouillon. Les totaux, l'état, le numéro et les
 * informations de validation sont calculés par le serveur.
 */
export class CreateJournalEntryDto {
  @IsMongoId()
  property_id!: string;

  @IsMongoId()
  journal_id!: string;

  @IsDateString()
  date!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  reference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  narration?: string;

  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => JournalEntryLineDto)
  lines!: JournalEntryLineDto[];
}

export class UpdateJournalEntryDto extends PartialType(
  OmitType(CreateJournalEntryDto, ['property_id'] as const),
) {}

/** Contre-passation : date de l'écriture miroir (aujourd'hui par défaut). */
export class ReverseJournalEntryDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class JournalEntryQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsMongoId()
  property_id?: string;

  @IsOptional()
  @IsMongoId()
  journal_id?: string;

  @IsOptional()
  @IsMongoId()
  account_id?: string;

  @IsOptional()
  @IsEnum(JournalEntryState)
  state?: JournalEntryState;

  @IsOptional()
  @IsDateString()
  date_from?: string;

  @IsOptional()
  @IsDateString()
  date_to?: string;
}
