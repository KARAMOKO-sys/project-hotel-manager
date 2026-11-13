import { Type } from 'class-transformer';
import {
  Equals,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  CommissionPaymentMethod,
  PartnerType,
} from '../schemas/partner.entity';

/** Coordonnées bancaires pour le versement des commissions. */
export class PartnerBankAccountDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  account_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  account_number?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  bank_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  bank_code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  swift_code?: string;
}

/**
 * DTO d'inscription d'un partenaire (cf. Documents.txt §4.4).
 *
 * Le partenaire est créé « en attente » : son statut, sa commission et sa
 * limite de propriétés sont gérés par les administrateurs via des routes
 * dédiées.
 */
export class CreatePartnerDto {
  // Informations personnelles
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  first_name?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  last_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  language?: string;

  // Informations société
  @IsString()
  @Length(1, 255)
  company_name!: string;

  @IsEnum(PartnerType)
  partner_type!: PartnerType;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  company_registration?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  tax_id?: string;

  @IsOptional()
  @IsUrl()
  company_logo_url?: string;

  @IsOptional()
  @IsUrl()
  company_website?: string;

  // Contact (par défaut : identité du compte)
  @IsOptional()
  @IsString()
  @MaxLength(255)
  contact_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  contact_phone?: string;

  @IsOptional()
  @IsEmail()
  contact_email?: string;

  // Documents
  @IsOptional()
  @IsUrl()
  registration_document_url?: string;

  @IsOptional()
  @IsUrl()
  tax_document_url?: string;

  @IsOptional()
  @IsUrl()
  contract_document_url?: string;

  @IsOptional()
  @IsEnum(CommissionPaymentMethod)
  commission_payment_method?: CommissionPaymentMethod;

  @IsOptional()
  @ValidateNested()
  @Type(() => PartnerBankAccountDto)
  bank_account?: PartnerBankAccountDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  certifications?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specializations?: string[];

  // Acceptation des conditions
  @IsBoolean()
  @Equals(true, { message: 'Les conditions générales doivent être acceptées' })
  terms_accepted!: boolean;

  @IsBoolean()
  @Equals(true, {
    message: 'Le traitement des données doit être accepté',
  })
  data_processing_accepted!: boolean;
}
