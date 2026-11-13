import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  IdentificationType,
  OwnerSubscriptionPlan,
} from '../schemas/owner.entity';

/** Coordonnées GPS de l'adresse du propriétaire. */
export class OwnerCoordinatesDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;
}

/** Détails d'adresse complémentaires. */
export class OwnerAddressDetailsDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  street?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  district?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  landmark?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => OwnerCoordinatesDto)
  coordinates?: OwnerCoordinatesDto;
}

/**
 * DTO de création d'un propriétaire.
 *
 * Le statut (`owner_status`), la vérification et les compteurs sont gérés
 * par le service ; le mot de passe est hashé avant enregistrement.
 */
export class CreateOwnerDto {
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
  @IsUrl()
  @MaxLength(500)
  avatar_url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  language?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  timezone?: string;

  // Entreprise
  @IsOptional()
  @IsString()
  @MaxLength(255)
  company_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  company_registration?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  tax_id?: string;

  // Identité
  @IsOptional()
  @IsDateString()
  birth_date?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  nationality?: string;

  @IsOptional()
  @IsEnum(IdentificationType)
  id_type?: IdentificationType;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  id_number?: string;

  @IsOptional()
  @IsUrl()
  id_document_url?: string;

  // Adresse
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  postal_code?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => OwnerAddressDetailsDto)
  address_details?: OwnerAddressDetailsDto;

  // Contact d'urgence
  @IsOptional()
  @IsString()
  @MaxLength(255)
  emergency_contact_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  emergency_contact_phone?: string;

  // Documents
  @IsOptional()
  @IsUrl()
  contract_document_url?: string;

  @IsOptional()
  @IsDateString()
  contract_signed_at?: string;

  @IsOptional()
  @IsUrl()
  business_license_url?: string;

  @IsOptional()
  @IsUrl()
  insurance_document_url?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  certifications?: string[];

  /** Plan d'abonnement initial (par défaut : basique). */
  @IsOptional()
  @IsEnum(OwnerSubscriptionPlan)
  subscription_plan?: OwnerSubscriptionPlan;

  @IsOptional()
  @IsObject()
  preferences?: Record<string, any>;
}
