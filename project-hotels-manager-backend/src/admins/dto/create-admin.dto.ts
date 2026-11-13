import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsInt,
  IsIP,
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
 * DTO de création d'un super administrateur.
 *
 * Le mot de passe est fourni en clair puis hashé par le service ; il n'est
 * jamais persisté tel quel.
 */
export class CreateAdminDto {
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

  @IsOptional()
  @IsString()
  @MaxLength(100)
  employee_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  department?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  position?: string;

  /** Niveau d'accès de 1 (restreint) à 5 (accès complet). */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  access_level?: number;

  @IsOptional()
  @IsBoolean()
  can_manage_system?: boolean;

  @IsOptional()
  @IsBoolean()
  can_manage_users?: boolean;

  @IsOptional()
  @IsBoolean()
  can_view_all_orgs?: boolean;

  @IsOptional()
  @IsBoolean()
  receive_system_alerts?: boolean;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  alert_email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  alert_phone?: string;

  /** Montant maximal approuvable (0 = illimité). */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  approval_limit?: number;

  @IsOptional()
  @IsDateString()
  hire_date?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  managed_departments?: string[];

  @IsOptional()
  @IsObject()
  system_preferences?: Record<string, any>;

  @IsOptional()
  @IsArray()
  @IsIP(undefined, { each: true })
  ip_whitelist?: string[];

  @IsOptional()
  @IsBoolean()
  mfa_required?: boolean;
}
