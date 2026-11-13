import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsMongoId,
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
} from 'class-validator';

/**
 * DTO de création d'un comptable rattaché à une propriété.
 *
 * Le mot de passe est fourni en clair puis hashé par le service.
 */
export class CreateAccountantDto {
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @IsMongoId()
  property_id!: string;

  @IsString()
  @Length(1, 50)
  employee_code!: string;

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

  @IsOptional()
  @IsString()
  @MaxLength(100)
  certification?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  certifications?: string[];

  @IsOptional()
  @IsBoolean()
  can_create_invoices?: boolean;

  @IsOptional()
  @IsBoolean()
  can_process_refunds?: boolean;

  @IsOptional()
  @IsBoolean()
  can_export_reports?: boolean;

  /** Montant maximal que le comptable peut approuver seul. */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999.99)
  approval_limit?: number;

  @IsOptional()
  @IsDateString()
  hire_date?: string;

  @IsOptional()
  @IsObject()
  preferences?: Record<string, any>;
}
