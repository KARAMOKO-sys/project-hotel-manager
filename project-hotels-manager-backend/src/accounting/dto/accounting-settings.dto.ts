import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsOptional,
  Matches,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Currency } from '../../base-entities/enums/currency.enum';
import { ACCOUNT_CODE_PATTERN } from '../domain/accounting.logic';

const ACCOUNT_CODE_MESSAGE = 'Code de compte SYSCOHADA invalide';
const JOURNAL_CODE = /^[A-Za-z0-9]{1,10}$/;
const JOURNAL_CODE_MESSAGE = 'Code de journal invalide';

/** Initialisation du plan comptable d'un établissement. */
export class SetupAccountingDto {
  @IsMongoId()
  property_id!: string;
}

export class AccountingSettingsQueryDto {
  @IsMongoId()
  property_id!: string;
}

/** Comptes de contrepartie (codes du plan comptable de l'établissement). */
export class AccountMappingDto {
  @IsOptional()
  @Matches(ACCOUNT_CODE_PATTERN, { message: ACCOUNT_CODE_MESSAGE })
  receivable?: string;
  @IsOptional()
  @Matches(ACCOUNT_CODE_PATTERN, { message: ACCOUNT_CODE_MESSAGE })
  payable?: string;
  @IsOptional()
  @Matches(ACCOUNT_CODE_PATTERN, { message: ACCOUNT_CODE_MESSAGE })
  revenue_accommodation?: string;
  @IsOptional()
  @Matches(ACCOUNT_CODE_PATTERN, { message: ACCOUNT_CODE_MESSAGE })
  revenue_fnb?: string;
  @IsOptional()
  @Matches(ACCOUNT_CODE_PATTERN, { message: ACCOUNT_CODE_MESSAGE })
  revenue_other?: string;
  @IsOptional()
  @Matches(ACCOUNT_CODE_PATTERN, { message: ACCOUNT_CODE_MESSAGE })
  tax_collected?: string;
  @IsOptional()
  @Matches(ACCOUNT_CODE_PATTERN, { message: ACCOUNT_CODE_MESSAGE })
  tax_deductible?: string;
  @IsOptional()
  @Matches(ACCOUNT_CODE_PATTERN, { message: ACCOUNT_CODE_MESSAGE })
  cash?: string;
  @IsOptional()
  @Matches(ACCOUNT_CODE_PATTERN, { message: ACCOUNT_CODE_MESSAGE })
  bank?: string;
  @IsOptional()
  @Matches(ACCOUNT_CODE_PATTERN, { message: ACCOUNT_CODE_MESSAGE })
  mobile_money?: string;
  @IsOptional()
  @Matches(ACCOUNT_CODE_PATTERN, { message: ACCOUNT_CODE_MESSAGE })
  purchases?: string;
  @IsOptional()
  @Matches(ACCOUNT_CODE_PATTERN, { message: ACCOUNT_CODE_MESSAGE })
  purchases_raw_materials?: string;
  @IsOptional()
  @Matches(ACCOUNT_CODE_PATTERN, { message: ACCOUNT_CODE_MESSAGE })
  purchases_supplies?: string;
  @IsOptional()
  @Matches(ACCOUNT_CODE_PATTERN, { message: ACCOUNT_CODE_MESSAGE })
  purchases_other?: string;
  @IsOptional()
  @Matches(ACCOUNT_CODE_PATTERN, { message: ACCOUNT_CODE_MESSAGE })
  stock?: string;
  @IsOptional()
  @Matches(ACCOUNT_CODE_PATTERN, { message: ACCOUNT_CODE_MESSAGE })
  salaries?: string;
  @IsOptional()
  @Matches(ACCOUNT_CODE_PATTERN, { message: ACCOUNT_CODE_MESSAGE })
  social_charges?: string;
  @IsOptional()
  @Matches(ACCOUNT_CODE_PATTERN, { message: ACCOUNT_CODE_MESSAGE })
  bank_fees?: string;
  @IsOptional()
  @Matches(ACCOUNT_CODE_PATTERN, { message: ACCOUNT_CODE_MESSAGE })
  suspense?: string;
}

/** Journaux utilisés par la comptabilisation automatique (codes). */
export class JournalMappingDto {
  @IsOptional()
  @Matches(JOURNAL_CODE, { message: JOURNAL_CODE_MESSAGE })
  sale?: string;
  @IsOptional()
  @Matches(JOURNAL_CODE, { message: JOURNAL_CODE_MESSAGE })
  purchase?: string;
  @IsOptional()
  @Matches(JOURNAL_CODE, { message: JOURNAL_CODE_MESSAGE })
  cash?: string;
  @IsOptional()
  @Matches(JOURNAL_CODE, { message: JOURNAL_CODE_MESSAGE })
  bank?: string;
  @IsOptional()
  @Matches(JOURNAL_CODE, { message: JOURNAL_CODE_MESSAGE })
  mobile_money?: string;
  @IsOptional()
  @Matches(JOURNAL_CODE, { message: JOURNAL_CODE_MESSAGE })
  general?: string;
}

/** Mise à jour des paramètres comptables d'un établissement. */
export class UpdateAccountingSettingsDto {
  @IsMongoId()
  property_id!: string;

  /** `null` lève le verrouillage. */
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsDateString()
  lock_date?: string | null;

  @IsOptional()
  @IsBoolean()
  auto_posting?: boolean;

  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @IsOptional()
  @ValidateNested()
  @Type(() => AccountMappingDto)
  accounts?: AccountMappingDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => JournalMappingDto)
  journals?: JournalMappingDto;
}
